from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional
import joblib
import json
import os

from backend.database.db import twin_states_collection, predictions_collection
from backend.digital_twin.features import FEATURE_SPECS, MODEL_FEATURES, group_by_feature, label
from backend.digital_twin.models import DigitalTwinState, ObservationValues
from backend.digital_twin.engine import DigitalTwinEngine
from backend.rag.retriever import ClinicalRetriever, MOCK_CLINICAL_CORPUS
from backend.rag.llm_client import ClinicalLLM

from backend.api.auth import router as auth_router, get_current_user

app = FastAPI(title="Explainable AI Digital Twin API - Secure")

app.include_router(auth_router)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML Models
models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../models'))
try:
    xgb_model = joblib.load(os.path.join(models_dir, 'xgboost_hba1c.pkl'))
    preprocessor = joblib.load(os.path.join(models_dir, 'preprocessor.pkl'))
    explainer = joblib.load(os.path.join(models_dir, 'shap_explainer.pkl'))
    feature_names = joblib.load(os.path.join(models_dir, 'feature_names.pkl'))
    model_meta = {}
    meta_path = os.path.join(models_dir, 'model_meta.json')
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            model_meta = json.load(f)
    dt_engine = DigitalTwinEngine(xgb_model, preprocessor, explainer, feature_names, meta=model_meta)
except Exception as e:
    print(f"Warning: ML Models failed to load. {e}")
    dt_engine = None

# Initialize RAG and LLM
retriever = ClinicalRetriever()
retriever.load_corpus(MOCK_CLINICAL_CORPUS)
llm = ClinicalLLM()

class ObservationInput(BaseModel):
    data: ObservationValues
    measured_hba1c: Optional[float] = Field(None, ge=3, le=20)

class SimulateInput(BaseModel):
    scenario_name: str
    modified_variables: ObservationValues

class AskInput(BaseModel):
    query: str

def save_twin_to_db(twin: DigitalTwinState):
    twin_dict = twin.model_dump()
    twin_states_collection.update_one(
        {"patient_id": twin.patient_id},
        {"$set": twin_dict},
        upsert=True
    )

def save_prediction_to_db(twin: DigitalTwinState):
    pred = twin.get_latest_prediction()
    if pred:
        pred_doc = pred.model_dump()
        pred_doc["patient_id"] = twin.patient_id
        predictions_collection.insert_one(pred_doc)

def model_info() -> dict:
    """Version and held-out test accuracy of the deployed model (from models/model_meta.json)."""
    if not dt_engine:
        return {}
    evaluation = dt_engine.meta.get("evaluation", {})
    return {
        "version": dt_engine.model_version,
        "feature_version": dt_engine.feature_version,
        "mae": evaluation.get("xgboost", {}).get("mae"),
        "r2": evaluation.get("xgboost", {}).get("r2"),
        "test_rows": evaluation.get("test_rows"),
    }

@app.get("/")
def root():
    return {"message": "Digital Twin API is running securely."}

# --- Digital Twin Endpoints ---
def get_twin_secure(patient_id: str, current_user: dict) -> DigitalTwinState:
    # Patients can only reach their own twin; "me" is an alias for their own email
    if patient_id not in ("me", current_user["email"]):
        raise HTTPException(status_code=403, detail="You can only access your own digital twin.")
    pid = current_user["email"]

    doc = twin_states_collection.find_one({"patient_id": pid})
    if not doc:
        # Auto-initialize an empty twin; the first logged visit supplies all model inputs
        twin = DigitalTwinState(patient_id=pid)
        twin_states_collection.insert_one(twin.model_dump())
        return twin

    if "_id" in doc:
        del doc["_id"]
    return DigitalTwinState(**doc)

@app.get("/patients/{patient_id}/twin")
def get_twin(patient_id: str, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    if not twin.predictions and dt_engine and twin.current_state:
        twin = dt_engine.update(twin, twin.current_state)
        save_twin_to_db(twin)
    return twin

@app.post("/patients/{patient_id}/update")
def update_twin(patient_id: str, obs: ObservationInput, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    if not dt_engine:
        raise HTTPException(status_code=500, detail="ML Engine not loaded")

    new_data = obs.data.model_dump(exclude_none=True)
    known = {**twin.to_feature_vector(), **new_data}
    missing = [label(code) for code in MODEL_FEATURES if known.get(code) is None]
    if missing:
        raise HTTPException(status_code=422, detail=f"Please provide: {', '.join(missing)}")

    twin = dt_engine.update(twin, new_data, measured_hba1c=obs.measured_hba1c)
    save_twin_to_db(twin)
    save_prediction_to_db(twin)
    return {"message": "Twin updated with real ML prediction", "state": twin.current_state}

class DemographicsInput(BaseModel):
    age: int = Field(ge=FEATURE_SPECS["RIDAGEYR"]["min"], le=FEATURE_SPECS["RIDAGEYR"]["max"])
    gender: Literal[1, 2]

@app.post("/patients/{patient_id}/demographics")
def update_demographics(patient_id: str, demo: DemographicsInput, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    twin.demographics['RIDAGEYR'] = demo.age
    twin.demographics['RIAGENDR'] = demo.gender

    # If they already have a full state, update it
    if twin.current_state:
        twin.current_state['RIDAGEYR'] = demo.age
        twin.current_state['RIAGENDR'] = demo.gender

        # Trigger an update so the dashboard reflects the new risk based on age
        if dt_engine:
            twin = dt_engine.update(twin, twin.current_state)
            save_prediction_to_db(twin)

    save_twin_to_db(twin)
    return {"message": "Demographics updated"}

@app.get("/patients/{patient_id}/prediction")
def get_prediction(patient_id: str, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    if not twin.predictions and dt_engine and twin.current_state:
        twin = dt_engine.update(twin, twin.current_state)
        save_twin_to_db(twin)

    pred = twin.get_latest_prediction()
    if not pred:
        # Return empty data instead of 404 to avoid frontend crash on brand new accounts
        return {
            "current_prediction": None,
            "model_info": model_info(),
            "history": []
        }

    return {
        "current_prediction": pred,
        "model_info": model_info(),
        "history": [
             {"name": f"Visit {i + 1}", "hba1c": round(p.predicted_value, 2),
              "measured": p.measured_hba1c, "calibrated": p.calibrated_value}
             for i, p in enumerate(twin.predictions)
        ]
    }

@app.post("/patients/{patient_id}/simulate")
def simulate(patient_id: str, sim: SimulateInput, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    if not dt_engine:
        raise HTTPException(status_code=500, detail="ML Engine not loaded")
    if not twin.current_state:
        raise HTTPException(status_code=400, detail="Log your first visit before running a what-if simulation.")

    scenario = dt_engine.simulate(twin, sim.scenario_name, sim.modified_variables.model_dump(exclude_none=True))
    save_twin_to_db(twin)
    return scenario

@app.post("/patients/{patient_id}/ask")
def ask_ai(patient_id: str, query: AskInput, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    pred = twin.get_latest_prediction()
    if not pred:
        raise HTTPException(status_code=400, detail="Log your first visit so the twin has an estimate to explain.")

    # Search the guideline library for what actually drives this patient's estimate
    shap_local = pred.shap_local or {}
    grouped = group_by_feature(shap_local.keys(), shap_local.values())
    top_drivers = sorted(grouped, key=lambda code: abs(grouped[code]), reverse=True)[:3]
    docs = retriever.retrieve(f"{query.query}: {', '.join(label(code) for code in top_drivers)} and HbA1c")

    what_if = twin.what_if_scenarios[-1].model_dump() if twin.what_if_scenarios else None

    result = llm.generate_explanation(
        twin_state=twin.current_state,
        prediction=pred.model_dump(),
        evidence=docs,
        what_if=what_if,
        model_mae=model_info().get("mae"),
        question=query.query
    )
    return {"explanation": result["text"], "mode": result["mode"], "sources": docs}

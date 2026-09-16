from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import datetime
import joblib
import os

from backend.database.db import patients_collection, twin_states_collection, predictions_collection
from backend.digital_twin.models import DigitalTwinState, WhatIfScenario
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
    dt_engine = DigitalTwinEngine(xgb_model, preprocessor, explainer, feature_names)
except Exception as e:
    print(f"Warning: ML Models failed to load. {e}")
    dt_engine = None

# Initialize RAG and LLM
retriever = ClinicalRetriever()
retriever.load_corpus(MOCK_CLINICAL_CORPUS)
llm = ClinicalLLM()

class ObservationInput(BaseModel):
    data: Dict[str, Any]

class SimulateInput(BaseModel):
    scenario_name: str
    modified_variables: Dict[str, Any]

class AskInput(BaseModel):
    query: str

def save_twin_to_db(twin: DigitalTwinState):
    twin_dict = twin.dict()
    twin_states_collection.update_one(
        {"patient_id": twin.patient_id},
        {"$set": twin_dict},
        upsert=True
    )

@app.get("/")
def root():
    return {"message": "Digital Twin API is running securely."}

# --- Digital Twin Endpoints ---
def get_twin_secure(patient_id: str, current_user: dict) -> DigitalTwinState:
    pid = current_user["email"] if patient_id == "me" else patient_id
    
    doc = twin_states_collection.find_one({"patient_id": pid})
    if not doc:
        # Auto-initialize twin for new patient (Empty state initially)
        twin = DigitalTwinState(patient_id=pid)
        # Pre-fill some hidden baselines because the UI form only asks for 4 variables.
        twin.demographics = {'RIDAGEYR': 45, 'RIAGENDR': 1.0}
        twin.lifestyle_state = {'SMQ020': 2.0}
        # clinical_state and current_state start empty!
        twin.clinical_state = {}
        twin.current_state = {}
        
        twin_dict = twin.dict()
        twin_states_collection.insert_one(twin_dict)
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
    
    if dt_engine:
        twin = dt_engine.update(twin, obs.data)
        save_twin_to_db(twin)
        
        pred = twin.get_latest_prediction()
        if pred:
            pred_doc = pred.dict()
            pred_doc["patient_id"] = twin.patient_id
            predictions_collection.insert_one(pred_doc)
            
        return {"message": "Twin updated with real ML prediction", "state": twin.current_state}
    else:
        raise HTTPException(status_code=500, detail="ML Engine not loaded")

class DemographicsInput(BaseModel):
    age: int
    gender: int

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
            pred = twin.get_latest_prediction()
            if pred:
                pred_doc = pred.dict()
                pred_doc["patient_id"] = twin.patient_id
                predictions_collection.insert_one(pred_doc)
            
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
            "history": []
        }
        
    return {
        "current_prediction": pred,
        "history": [
             {"name": f"T-{len(twin.predictions)-i}", "risk": p.risk_score, "hba1c": p.predicted_value}
             for i, p in enumerate(twin.predictions)
        ]
    }

@app.post("/patients/{patient_id}/simulate")
def simulate(patient_id: str, sim: SimulateInput, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    
    if dt_engine:
        scenario = dt_engine.simulate(twin, sim.scenario_name, sim.modified_variables)
        save_twin_to_db(twin)
        return scenario
    raise HTTPException(status_code=500, detail="ML Engine not loaded")

@app.post("/patients/{patient_id}/ask")
def ask_ai(patient_id: str, query: AskInput, current_user: dict = Depends(get_current_user)):
    twin = get_twin_secure(patient_id, current_user)
    docs = retriever.retrieve(query.query)
    
    pred = twin.get_latest_prediction()
    pred_dict = pred.dict() if pred else {"predicted_value": "N/A", "shap_local": {}}
    what_if = twin.what_if_scenarios[-1].dict() if twin.what_if_scenarios else None
    
    explanation = llm.generate_explanation(
        twin_state=twin.current_state,
        prediction=pred_dict,
        evidence=docs,
        what_if=what_if
    )
    return {"explanation": explanation, "sources": docs}

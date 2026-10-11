from pydantic import BaseModel, Field
from typing import Dict, List, Any, Literal, Optional
from datetime import datetime

from .features import FEATURE_SPECS


def _within_range(code: str):
    spec = FEATURE_SPECS[code]
    return Field(None, ge=spec["min"], le=spec["max"])


class ObservationValues(BaseModel):
    """Model inputs a patient can submit. Values outside the training data's range are rejected."""
    RIDAGEYR: Optional[int] = _within_range("RIDAGEYR")
    RIAGENDR: Optional[Literal[1, 2]] = None
    BMXBMI: Optional[float] = _within_range("BMXBMI")
    BMXWAIST: Optional[float] = _within_range("BMXWAIST")
    LBXGLU: Optional[float] = _within_range("LBXGLU")
    PAQ605: Optional[Literal[1, 2]] = None
    SMQ020: Optional[Literal[1, 2]] = None

class Observation(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    demographics: Dict[str, Any] = {}
    clinical_state: Dict[str, Any] = {}
    lifestyle_state: Dict[str, Any] = {}
    measured_hba1c: Optional[float] = None  # lab result logged at this visit; never a model input

class PredictionResult(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    model_name: str
    model_version: str
    dataset: str
    feature_version: str
    predicted_value: float
    risk_score: Optional[float] = None
    shap_global: Optional[Dict[str, float]] = None
    shap_local: Optional[Dict[str, float]] = None
    shap_base_value: Optional[float] = None  # the model's average estimate; SHAP values start from here
    inputs: Optional[Dict[str, Any]] = None  # the exact values the model saw for this estimate
    measured_hba1c: Optional[float] = None
    calibrated_value: Optional[float] = None  # estimate shifted by this patient's past lab-vs-estimate gap
    calibration_points: int = 0

class WhatIfScenario(BaseModel):
    scenario_name: str
    timestamp: datetime = Field(default_factory=datetime.now)
    modified_variables: Dict[str, Any]
    baseline_prediction: float
    scenario_prediction: float
    prediction_difference: float
    message: str

class DigitalTwinState(BaseModel):
    patient_id: str
    demographics: Dict[str, Any] = {}
    clinical_state: Dict[str, Any] = {}
    lifestyle_state: Dict[str, Any] = {}
    derived_features: Dict[str, Any] = {}

    historical_observations: List[Observation] = []
    current_state: Dict[str, Any] = {}

    predictions: List[PredictionResult] = []
    risk_scores: List[float] = []
    shap_explanations: List[Dict[str, Any]] = []

    active_interventions: List[str] = []
    what_if_scenarios: List[WhatIfScenario] = []

    timestamp: datetime = Field(default_factory=datetime.now)
    model_version: str = "1.0.0"

    def get_latest_prediction(self) -> Optional[PredictionResult]:
        if not self.predictions:
            return None
        return self.predictions[-1]

    def to_feature_vector(self) -> Dict[str, Any]:
        """Flattens the current state into a single dictionary for ML inference."""
        features = {}
        features.update(self.demographics)
        features.update(self.clinical_state)
        features.update(self.lifestyle_state)
        return features

from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

class Observation(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    demographics: Dict[str, Any] = {}
    clinical_state: Dict[str, Any] = {}
    lifestyle_state: Dict[str, Any] = {}

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

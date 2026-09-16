import pandas as pd
import numpy as np
import shap
from datetime import datetime
from typing import Dict, Any, List

from .models import DigitalTwinState, Observation, PredictionResult, WhatIfScenario

class DigitalTwinEngine:
    def __init__(self, model, preprocessor, explainer, feature_names: List[str]):
        """
        Initializes the Digital Twin Engine.
        :param model: Trained Scikit-Learn or XGBoost model.
        :param preprocessor: Fitted Scikit-Learn ColumnTransformer/Pipeline.
        :param explainer: SHAP explainer fitted on the model.
        :param feature_names: Ordered list of feature names expected by the model.
        """
        self.model = model
        self.preprocessor = preprocessor
        self.explainer = explainer
        self.feature_names = feature_names

    def update(self, twin: DigitalTwinState, new_data: Dict[str, Any]) -> DigitalTwinState:
        """
        Processes a new observation sequentially.
        1. Validates & Normalizes
        2. Updates patient history & current state
        3. Generates new prediction & SHAP explanation
        4. Stores updated state
        """
        # Create new observation
        obs = Observation(
            timestamp=datetime.now(),
            demographics={k: v for k, v in new_data.items() if k in ['RIDAGEYR', 'RIAGENDR']},
            clinical_state={k: v for k, v in new_data.items() if k in ['BMXBMI', 'BMXWAIST', 'LBXGLU']},
            lifestyle_state={k: v for k, v in new_data.items() if k in ['PAQ605', 'SMQ020']}
        )
        
        # Update history and current state
        twin.historical_observations.append(obs)
        twin.demographics.update(obs.demographics)
        twin.clinical_state.update(obs.clinical_state)
        twin.lifestyle_state.update(obs.lifestyle_state)
        
        twin.current_state = twin.to_feature_vector()
        twin.timestamp = datetime.now()
        
        # Trigger Prediction and Explanation
        pred_result = self.predict(twin)
        twin.predictions.append(pred_result)
        twin.risk_scores.append(pred_result.risk_score or 0.0)
        
        return twin

    def _prepare_features(self, state_dict: Dict[str, Any]) -> pd.DataFrame:
        """Helper to transform dictionary into preprocessed DataFrame."""
        df = pd.DataFrame([state_dict])
        # Ensure all columns exist (fill missing with NaN)
        for col in self.preprocessor.feature_names_in_:
            if col not in df.columns:
                df[col] = np.nan
                
        df_ordered = df[self.preprocessor.feature_names_in_]
        X_prep = self.preprocessor.transform(df_ordered)
        return pd.DataFrame(X_prep, columns=self.feature_names)

    def predict(self, twin: DigitalTwinState) -> PredictionResult:
        X_df = self._prepare_features(twin.current_state)
        
        # Prediction
        pred_val = self.model.predict(X_df)[0]
        
        # Explainability
        shap_values = self.explainer(X_df)
        local_shap = dict(zip(self.feature_names, shap_values.values[0]))
        
        # We can mock a risk score based on the prediction if it's regression
        risk = float(pred_val) / 10.0 if pred_val > 0 else 0.0
        
        return PredictionResult(
            model_name=self.model.__class__.__name__,
            model_version=twin.model_version,
            dataset="NHANES_2017_2018",
            feature_version="v1",
            predicted_value=float(pred_val),
            risk_score=risk,
            shap_local=local_shap
        )

    def simulate(self, twin: DigitalTwinState, scenario_name: str, modified_vars: Dict[str, Any]) -> WhatIfScenario:
        """
        Counterfactual / What-if Simulator
        1. Obtain baseline feature vector.
        2. Generate baseline prediction.
        3. Modify intervention variables.
        4. Re-run SAME ML model.
        5. Compare and return WhatIfScenario.
        """
        baseline_pred = self.predict(twin).predicted_value
        
        # Create modified state
        simulated_state = twin.current_state.copy()
        simulated_state.update(modified_vars)
        
        X_df_sim = self._prepare_features(simulated_state)
        scenario_pred = float(self.model.predict(X_df_sim)[0])
        
        diff = scenario_pred - baseline_pred
        
        msg = f"Under the model's learned associations, this simulated scenario is associated with an estimated change of {diff:.2f}."
        
        scenario = WhatIfScenario(
            scenario_name=scenario_name,
            modified_variables=modified_vars,
            baseline_prediction=baseline_pred,
            scenario_prediction=scenario_pred,
            prediction_difference=diff,
            message=msg
        )
        
        twin.what_if_scenarios.append(scenario)
        return scenario

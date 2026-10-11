import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional

from .features import (CATEGORICAL_FEATURES, CLINICAL_FEATURES, DEMOGRAPHIC_FEATURES, FEATURE_SPECS,
                       LIFESTYLE_FEATURES, group_by_feature)
from .models import DigitalTwinState, Observation, PredictionResult, WhatIfScenario

class DigitalTwinEngine:
    def __init__(self, model, preprocessor, explainer, feature_names: List[str], meta: Optional[Dict[str, Any]] = None):
        """
        Initializes the Digital Twin Engine.
        :param model: Trained Scikit-Learn or XGBoost model.
        :param preprocessor: Fitted Scikit-Learn ColumnTransformer/Pipeline.
        :param explainer: SHAP explainer fitted on the model.
        :param feature_names: Ordered list of feature names expected by the model.
        :param meta: Contents of models/model_meta.json (version and held-out test scores).
        """
        self.model = model
        self.preprocessor = preprocessor
        self.explainer = explainer
        self.feature_names = feature_names
        self.meta = meta or {}
        self.model_version = self.meta.get("model_version", "1.0.0")
        self.feature_version = self.meta.get("feature_version", "v1")

    def update(self, twin: DigitalTwinState, new_data: Dict[str, Any], measured_hba1c: Optional[float] = None) -> DigitalTwinState:
        """
        Processes a new observation sequentially.
        1. Validates & Normalizes
        2. Updates patient history & current state
        3. Generates new prediction & SHAP explanation
        4. Calibrates it against the patient's earlier lab results
        """
        # Create new observation
        obs = Observation(
            timestamp=datetime.now(),
            demographics={k: v for k, v in new_data.items() if k in DEMOGRAPHIC_FEATURES},
            clinical_state={k: v for k, v in new_data.items() if k in CLINICAL_FEATURES},
            lifestyle_state={k: v for k, v in new_data.items() if k in LIFESTYLE_FEATURES},
            measured_hba1c=measured_hba1c
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
        pred_result.measured_hba1c = measured_hba1c
        self._calibrate(twin, pred_result)
        twin.predictions.append(pred_result)

        return twin

    def _calibrate(self, twin: DigitalTwinState, pred_result: PredictionResult):
        """Shifts the estimate by this patient's average gap between earlier lab results and estimates.

        Only earlier visits are used, so a visit's own lab result never leaks into its calibrated estimate.
        """
        gaps = [p.measured_hba1c - p.predicted_value for p in twin.predictions
                if p.measured_hba1c is not None and p.model_version == pred_result.model_version]
        if gaps:
            pred_result.calibrated_value = pred_result.predicted_value + sum(gaps) / len(gaps)
            pred_result.calibration_points = len(gaps)

    def _prepare_features(self, state_dict: Dict[str, Any]) -> pd.DataFrame:
        """Helper to transform dictionary into preprocessed DataFrame."""
        df = pd.DataFrame([state_dict])
        # Ensure all columns exist (fill missing with NaN)
        for col in self.preprocessor.feature_names_in_:
            if col not in df.columns:
                df[col] = np.nan

        # Codes the model never learned (e.g. an old "Low activity" = 3) are treated as missing
        for col in CATEGORICAL_FEATURES:
            if col in df.columns and df[col].iloc[0] not in FEATURE_SPECS[col]["choices"]:
                df[col] = np.nan

        df_ordered = df[self.preprocessor.feature_names_in_]
        X_prep = self.preprocessor.transform(df_ordered)
        return pd.DataFrame(X_prep, columns=self.feature_names)

    def predict(self, twin: DigitalTwinState) -> PredictionResult:
        X_df = self._prepare_features(twin.current_state)

        # Prediction
        pred_val = float(self.model.predict(X_df)[0])

        # Explainability: SHAP runs on the encoded columns; one-hot columns are then
        # summed back into the patient's 7 original inputs
        shap_values = self.explainer(X_df)
        local_shap = group_by_feature(self.feature_names, shap_values.values[0])

        return PredictionResult(
            model_name=self.model.__class__.__name__,
            model_version=self.model_version,
            dataset="NHANES_2017_2018",
            feature_version=self.feature_version,
            predicted_value=pred_val,
            shap_local=local_shap,
            shap_base_value=float(np.ravel(shap_values.base_values)[0]),
            inputs=dict(twin.current_state)
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

        msg = (f"Under the model's learned associations, this scenario changes the estimated HbA1c by "
               f"{diff:+.2f} percentage points. This is an association, not a guaranteed effect.")

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

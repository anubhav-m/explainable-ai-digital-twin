import json
import os

import joblib
import pytest
from pydantic import ValidationError

from backend.digital_twin.engine import DigitalTwinEngine
from backend.digital_twin.features import MODEL_FEATURES
from backend.digital_twin.models import DigitalTwinState, ObservationValues

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

# A typical patient with every model input filled in, as the visit form requires
BASE = {"RIDAGEYR": 45, "RIAGENDR": 1, "BMXBMI": 30.0, "BMXWAIST": 100.0, "LBXGLU": 100.0, "PAQ605": 2, "SMQ020": 2}


@pytest.fixture(scope="module")
def engine():
    def load(name):
        return joblib.load(os.path.join(MODELS_DIR, name))

    with open(os.path.join(MODELS_DIR, "model_meta.json")) as f:
        meta = json.load(f)
    return DigitalTwinEngine(load("xgboost_hba1c.pkl"), load("preprocessor.pkl"), load("shap_explainer.pkl"),
                             load("feature_names.pkl"), meta=meta)


def estimate(engine, data=None, **overrides):
    twin = engine.update(DigitalTwinState(patient_id="test"), {**(data or BASE), **overrides})
    return twin.get_latest_prediction()


def test_shap_values_add_up_to_the_estimate(engine):
    pred = estimate(engine)
    assert pred.shap_base_value + sum(pred.shap_local.values()) == pytest.approx(pred.predicted_value, abs=1e-3)


def test_shap_is_grouped_into_the_seven_inputs(engine):
    assert set(estimate(engine).shap_local) == set(MODEL_FEATURES)


@pytest.mark.parametrize("code, values", [
    ("RIDAGEYR", range(20, 81, 10)),
    ("BMXBMI", range(15, 61, 5)),
    ("BMXWAIST", range(60, 161, 10)),
    ("LBXGLU", range(60, 401, 20)),
])
def test_estimate_never_drops_as_a_risk_input_rises(engine, code, values):
    estimates = [estimate(engine, **{code: v}).predicted_value for v in values]
    assert all(later >= earlier - 1e-9 for earlier, later in zip(estimates, estimates[1:]))


def test_unknown_activity_code_is_treated_as_missing(engine):
    # Old records stored "Low activity" as 3, a value the model never learned
    legacy = estimate(engine, PAQ605=3).predicted_value
    missing = estimate(engine, data={k: v for k, v in BASE.items() if k != "PAQ605"}).predicted_value
    assert legacy == pytest.approx(missing)


def test_no_placeholder_risk_score(engine):
    assert estimate(engine).risk_score is None


def test_calibration_uses_only_earlier_lab_results(engine):
    twin = engine.update(DigitalTwinState(patient_id="test"), BASE, measured_hba1c=6.0)
    first = twin.get_latest_prediction()
    assert first.calibrated_value is None  # a visit's own lab result must not leak into its estimate

    second = engine.update(twin, BASE).get_latest_prediction()
    assert second.calibration_points == 1
    assert second.calibrated_value == pytest.approx(second.predicted_value + (6.0 - first.predicted_value))


def test_simulated_weight_loss_never_raises_the_estimate(engine):
    twin = engine.update(DigitalTwinState(patient_id="test"), {**BASE, "BMXBMI": 35.0})
    scenario = engine.simulate(twin, "Weight loss", {"BMXBMI": 25.0})
    assert scenario.prediction_difference <= 1e-9


@pytest.mark.parametrize("bad_input", [
    {"LBXGLU": 0}, {"BMXBMI": 0}, {"BMXWAIST": 0}, {"RIDAGEYR": 5}, {"PAQ605": 3}, {"RIAGENDR": 0},
])
def test_validation_rejects_impossible_values(bad_input):
    with pytest.raises(ValidationError):
        ObservationValues(**bad_input)


def test_validation_accepts_a_normal_visit():
    assert ObservationValues(**BASE).model_dump(exclude_none=True) == BASE

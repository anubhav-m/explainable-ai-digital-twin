"""The 7 model inputs: NHANES codes, readable labels, units and accepted values.

Numeric ranges cover the full NHANES 2017-2018 training data, so every accepted
value is inside what the model has seen.
"""
from typing import Any, Dict, Iterable

FEATURE_SPECS: Dict[str, Dict[str, Any]] = {
    "RIDAGEYR": {"label": "Age", "unit": "years", "min": 12, "max": 80},
    "RIAGENDR": {"label": "Gender", "choices": {1: "Male", 2: "Female"}},
    "BMXBMI": {"label": "BMI", "unit": "kg/m²", "min": 12, "max": 90},
    "BMXWAIST": {"label": "Waist circumference", "unit": "cm", "min": 50, "max": 180},
    "LBXGLU": {"label": "Fasting glucose", "unit": "mg/dL", "min": 40, "max": 500},
    # NHANES PAQ605: "Does your work involve vigorous-intensity activity?"
    "PAQ605": {"label": "Vigorous work activity", "choices": {1: "Yes", 2: "No"}},
    # NHANES SMQ020: "Smoked at least 100 cigarettes in life?"
    "SMQ020": {"label": "Smoked 100+ cigarettes", "choices": {1: "Yes", 2: "No"}},
}

MODEL_FEATURES = list(FEATURE_SPECS)
NUMERIC_FEATURES = [code for code, spec in FEATURE_SPECS.items() if "choices" not in spec]
CATEGORICAL_FEATURES = [code for code, spec in FEATURE_SPECS.items() if "choices" in spec]

DEMOGRAPHIC_FEATURES = ["RIDAGEYR", "RIAGENDR"]
CLINICAL_FEATURES = ["BMXBMI", "BMXWAIST", "LBXGLU"]
LIFESTYLE_FEATURES = ["PAQ605", "SMQ020"]


def label(code: str) -> str:
    return FEATURE_SPECS.get(code, {}).get("label", code)


def describe_value(code: str, value: Any) -> str:
    """Readable input, e.g. 'Fasting glucose (100 mg/dL)' or 'Gender (Male)'."""
    spec = FEATURE_SPECS.get(code)
    if spec is None:
        return f"{code} ({value})"
    if value is None:
        return f"{spec['label']} (not provided)"
    if "choices" in spec:
        return f"{spec['label']} ({spec['choices'].get(int(value), 'unknown')})"
    return f"{spec['label']} ({float(value):g} {spec['unit']})"


def group_by_feature(encoded_names: Iterable[str], values: Iterable[float]) -> Dict[str, float]:
    """Sums one-hot columns (e.g. PAQ605_1.0 + PAQ605_2.0) back into their original input.

    Exact for SHAP values, because SHAP values add up.
    """
    grouped: Dict[str, float] = {}
    for name, value in zip(encoded_names, values):
        code = name if name in FEATURE_SPECS else name.rsplit("_", 1)[0]
        grouped[code] = grouped.get(code, 0.0) + float(value)
    return grouped


def hba1c_category(value: float) -> str:
    """ADA diagnostic cut-offs."""
    if value < 5.7:
        return "normal range (below 5.7%)"
    if value < 6.5:
        return "prediabetes range (5.7-6.4%)"
    return "diabetes range (6.5% or higher)"

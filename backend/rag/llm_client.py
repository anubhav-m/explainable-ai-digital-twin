import os
from typing import Dict, Any, List, Optional, Tuple

from backend.digital_twin.features import (CLINICAL_FEATURES, DEMOGRAPHIC_FEATURES, LIFESTYLE_FEATURES,
                                           describe_value, group_by_feature, hba1c_category)

try:
    from google import genai
except ImportError:
    genai = None

class ClinicalLLM:
    def __init__(self, api_key: str = None, model_name: str = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model_name = model_name or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        if self.api_key and genai is not None:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            print("WARNING: GEMINI_API_KEY not found. AI explanations will use template mode.")

    def generate_explanation(self,
                           twin_state: Dict[str, Any],
                           prediction: Dict[str, Any],
                           evidence: List[Dict[str, str]],
                           what_if: Dict[str, Any] = None,
                           model_mae: Optional[float] = None,
                           question: str = "Explain my diabetes risk factors") -> Dict[str, str]:
        """
        Generates an evidence-grounded explanation based on the Digital Twin State.
        Returns {"mode": "llm" | "template", "text": ...}.
        """
        inputs = prediction.get("inputs") or twin_state
        drivers = self._top_drivers(prediction)
        template = self._template_explanation(inputs, prediction, drivers, evidence, what_if, model_mae)

        if not self.client:
            return {"mode": "template", "text": template}

        prompt = self._build_prompt(inputs, prediction, drivers, evidence, what_if, model_mae, question)
        try:
            response = self.client.models.generate_content(model=self.model_name, contents=prompt)
            return {"mode": "llm", "text": response.text}
        except Exception as e:
            return {"mode": "template", "text": f"The AI model could not be reached ({e}), so this is the template explanation.\n\n{template}"}

    @staticmethod
    def _lab_results(n: int) -> str:
        return f"{n} earlier lab result{'s' if n != 1 else ''}"

    @staticmethod
    def _top_drivers(prediction: Dict[str, Any], n: int = 3) -> List[Tuple[str, float]]:
        shap_local = prediction.get("shap_local") or {}
        grouped = group_by_feature(shap_local.keys(), shap_local.values())
        return sorted(grouped.items(), key=lambda item: abs(item[1]), reverse=True)[:n]

    def _build_prompt(self, inputs, prediction, drivers, evidence, what_if, model_mae, question) -> str:
        def section(codes):
            return "\n".join(f"- {describe_value(c, inputs.get(c))}" for c in codes)

        value = prediction["predicted_value"]
        base = prediction.get("shap_base_value")
        evidence_text = "\n".join([f"- {doc['text']} (Source: {doc['source']})" for doc in evidence])
        driver_text = "\n".join(f"- {describe_value(code, inputs.get(code))}: {contribution:+.2f}" for code, contribution in drivers)

        prompt = f"""
You are a clinical AI assistant generating patient-friendly explanations for a Type 2 Diabetes Digital Twin.
Your explanation must be grounded ONLY in the patient data, model output and retrieved evidence provided.

Do NOT diagnose, prescribe, or invent medical facts.
Distinguish clearly between the Model Prediction, Model Explanation, Evidence-Based Information, and Uncertainty.

## Patient State
Demographics:
{section(DEMOGRAPHIC_FEATURES)}
Clinical State:
{section(CLINICAL_FEATURES)}
Lifestyle:
{section(LIFESTYLE_FEATURES)}

## ML Prediction
Estimated HbA1c: {value:.2f}% ({hba1c_category(value)}). This is a model estimate, not a lab result.
"""
        if model_mae:
            prompt += f"The model's typical error on unseen people is about ±{model_mae:.2f} percentage points.\n"
        if prediction.get("calibrated_value") is not None:
            prompt += (f"Calibrated with the patient's own {self._lab_results(prediction['calibration_points'])}: "
                       f"{prediction['calibrated_value']:.2f}%.\n")

        prompt += f"""
## Model Explanation (SHAP, in HbA1c percentage points; positive pushes the estimate up)
Starting point (the model's average estimate): {f"{base:.2f}%" if base is not None else "unknown"}
Top contributors:
{driver_text}
SHAP values describe how the model used each input, not proven causes.

## Retrieved Evidence
{evidence_text}
"""

        if what_if:
            changes = ", ".join(describe_value(c, v) for c, v in what_if["modified_variables"].items())
            prompt += f"""
## Simulated What-If Scenario (a model association, not a guaranteed effect)
Scenario: {what_if.get('scenario_name')}
Modified Variables: {changes}
Estimated Change in HbA1c: {what_if['prediction_difference']:+.2f} percentage points
"""

        prompt += f"\nPatient question: {question}\nPlease provide a clear, empathetic, and evidence-grounded explanation for the patient in about 200 words."
        return prompt

    @staticmethod
    def _template_explanation(inputs, prediction, drivers, evidence, what_if, model_mae) -> str:
        """Explanation assembled directly from the twin's numbers, used when no LLM is available."""
        value = prediction["predicted_value"]
        base = prediction.get("shap_base_value")

        lines = [f"**Your estimated HbA1c is {value:.2f}%**, which is in the {hba1c_category(value)}."]
        accuracy = f" Its typical error is about ±{model_mae:.2f} percentage points." if model_mae else ""
        lines.append(f"This is an estimate from your digital twin's machine-learning model, not a lab result or a diagnosis.{accuracy}")
        if prediction.get("calibrated_value") is not None:
            lines.append(f"Adjusted with your own {ClinicalLLM._lab_results(prediction['calibration_points'])}, "
                         f"your twin's calibrated estimate is {prediction['calibrated_value']:.2f}%.")

        start = f" from the model's average estimate ({base:.2f}%)" if base is not None else ""
        lines += ["", f"**Why the model estimated this:** it starts{start}, and each of your inputs pushes the estimate up or down. The biggest pushes were:"]
        for code, contribution in drivers:
            direction = "raised" if contribution >= 0 else "lowered"
            lines.append(f"- {describe_value(code, inputs.get(code))} {direction} the estimate by {abs(contribution):.2f}")
        lines.append("These show how the model used your inputs, not proven causes.")

        if what_if:
            changes = ", ".join(describe_value(c, v) for c, v in what_if["modified_variables"].items())
            lines += ["", f"**Your last what-if scenario** ({changes}) changed the estimate by "
                          f"{what_if['prediction_difference']:+.2f} percentage points. This is an association the model learned, not a guaranteed effect."]

        if evidence:
            lines += ["", "**What the guideline library says:**"]
            lines += [f"- {doc['text']} ({doc['source']})" for doc in evidence]

        return "\n".join(lines)

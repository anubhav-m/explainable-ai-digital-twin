import google.generativeai as genai
import os
import json
from typing import Dict, Any, List

class ClinicalLLM:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("WARNING: GEMINI_API_KEY not found. LLM explanations will be mocked.")

    def generate_explanation(self, 
                           twin_state: Dict[str, Any], 
                           prediction: Dict[str, Any], 
                           evidence: List[Dict[str, str]],
                           what_if: Dict[str, Any] = None) -> str:
        """
        Generates an evidence-grounded explanation based on the Digital Twin State.
        """
        if not self.model:
            return self._mock_explanation(evidence)

        # Construct Prompt
        evidence_text = "\n".join([f"- {doc['text']} (Source: {doc['source']})" for doc in evidence])
        
        prompt = f"""
        You are a clinical AI assistant generating patient-friendly explanations for a Type 2 Diabetes Digital Twin.
        Your explanation must be grounded ONLY in the retrieved evidence provided.
        
        Do NOT diagnose, prescribe, or invent medical facts.
        Distinguish clearly between the Model Prediction, Model Explanation, Evidence-Based Information, and Uncertainty.

        ## Patient State
        Demographics: {twin_state.get('demographics')}
        Clinical State: {twin_state.get('clinical_state')}
        
        ## ML Prediction
        Predicted HbA1c: {prediction.get('predicted_value')}
        Top SHAP Contributors (Positive pushes HbA1c up, Negative pushes it down):
        {prediction.get('shap_local')}
        
        ## Retrieved Evidence
        {evidence_text}
        """

        if what_if:
            prompt += f"""
            ## Simulated What-If Scenario
            Scenario: {what_if.get('scenario_name')}
            Modified Variables: {what_if.get('modified_variables')}
            Estimated Change in HbA1c: {what_if.get('prediction_difference')}
            """

        prompt += "\n\nPlease provide a clear, empathetic, and evidence-grounded explanation for the patient."

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating explanation: {str(e)}"

    def _mock_explanation(self, evidence: List[Dict[str, str]]) -> str:
        return (
            "Based on your Digital Twin's current state, the model predicts your HbA1c may increase if current lifestyle factors are maintained.\n"
            "Your BMI and fasting glucose are the primary factors contributing to this prediction.\n\n"
            "**Evidence Base:**\n" + 
            "\n".join([f"- {doc['text']} ({doc['source']})" for doc in evidence])
        )

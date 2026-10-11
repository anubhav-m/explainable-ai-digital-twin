# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Patients: younger, tech-comfortable adults (roughly 20-40) who are used to health apps and want to understand their own type 2 diabetes risk. They mostly use the product on a laptop or desktop; phone use is secondary and must not break. They are not clinicians: they can handle dense screens and real numbers, but not unexplained medical or machine-learning jargon.

Secondary audience: capstone evaluators, who need to see the technical mechanism (XGBoost, SHAP, digital twin, RAG) named on screen.

## Product Purpose

A web app that keeps a digital twin of each patient: a stored copy of their health state that grows with every logged visit. For each visit it estimates HbA1c, explains which inputs pushed the estimate up or down, lets the patient simulate changes, calibrates itself against the patient's real lab results, and explains everything in plain language. Success: a patient understands why their estimate is what it is and what might change it.

## Positioning

The estimate is never a bare number. It always arrives with its reason (per-input SHAP contributions that add up exactly to the estimate), its honest error (typically within ±0.35 HbA1c points on 578 unseen people), and a personal calibration against the patient's own lab results.

## Operating Context

- Sign up / log in, then a single patient dashboard at `/patient/:patientId`.
- A visit is 7 inputs (age, gender, BMI, waist, fasting glucose, vigorous work activity, smoked 100+ cigarettes) plus an optional lab HbA1c.
- Six areas today: Overview, Predictions, Explainability, Digital Twin, What-If Simulator, AI Explanation.
- ADA cut-offs: below 5.7% normal, 5.7-6.4% prediabetes, 6.5% or higher diabetes range.

## Capabilities and Constraints

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide. Backend: FastAPI on port 8000, MongoDB.
- Every existing feature and backend call stays.
- Naming: patient-language labels lead, and the technical term stays visible beside them (for example "Why this number" with "SHAP"), so both audiences are served. Confirmed by the user's choice of the mockup that shows both.
- Light and dark themes both stay, with the toggle.
- Estimates are model estimates, never a diagnosis or a lab result; SHAP shows how the model used inputs, not causation. This wording must survive any redesign.
- Status colors for the three HbA1c ranges are always paired with an icon or label, never color alone.

## Brand Commitments

- Current product name on screen: "Explainable AI Digital Twin".
- The user rejected the incumbent blue-to-indigo/purple look as generic AI output. No purple.
- Required: smooth animation and skeleton loading states.

## Evidence on Hand

- Model results in `RESULTS.md` and `models/model_meta.json` (R² 0.77, MAE 0.35, 84% sensitivity, 98% specificity on 578 held-out people; NHANES 2017-2018).
- No testimonials, clinical endorsements, or regulatory claims exist; none may be invented.

## Product Principles

1. The number never travels alone: estimate, reason, and uncertainty appear together.
2. Plain language first, technical term second.
3. Honest about being a model: never implies diagnosis.
4. The patient's own history and lab results are the anchor, not population averages.

# Explainable AI Digital Twin for Diabetes Risk: Complete Project Explanation

This document explains the whole project: the problem, how the system works end to end, the data, the AI model, and the results. The last part is a presentation guide with a demo script and likely questions.

---

## 1. The project in one minute

**Problem.** Type 2 diabetes is often found late. HbA1c is the standard blood test for it: it measures average blood sugar over about 3 months. Patients rarely understand *why* their risk is what it is, or what might change it.

**What we built.** A web application that creates a **digital twin** of each patient: a stored virtual copy of their health state that grows with every visit. For each visit, the twin:

1. **Estimates HbA1c** with a machine-learning model (XGBoost) trained on real CDC data (NHANES 2017–2018).
2. **Explains the estimate** with SHAP: which inputs pushed it up or down, and by how much.
3. **Simulates "what if" changes** (lower weight, lower glucose) by re-running the same model.
4. **Learns from real lab results**: if the patient logs an actual lab HbA1c, the twin measures how far off it was and calibrates later estimates to that person.
5. **Explains everything in plain language** with an AI assistant grounded in guideline text (RAG: retrieval + a Gemini LLM).

**Headline result.** On 578 people the model never saw during training, the estimate is typically within **±0.35 HbA1c points** (R² = **0.77**). It catches **84%** of people whose lab HbA1c is in the diabetes range, with **98% specificity**.

---

## 2. Key terms

| Term | Meaning |
|---|---|
| **HbA1c** | Blood test showing average blood sugar over ~3 months. **Below 5.7% = normal, 5.7–6.4% = prediabetes, 6.5% or higher = diabetes range** (American Diabetes Association cut-offs). |
| **Digital twin** | A virtual copy of a real thing, kept in sync with it, that can be used to simulate and explain. Here: a virtual copy of a patient's health state. |
| **Machine learning model** | A program that learns a pattern from examples (thousands of real people) and applies it to new people. |
| **XGBoost** | A popular, accurate type of model built from many small decision trees. |
| **SHAP** | A method that splits one prediction into the contribution of each input, e.g. "fasting glucose added +0.28". |
| **RAG** | Retrieval-Augmented Generation: first *search* a library of trusted text, then let the AI write an answer *using* that text. |
| **R²** | How much of the difference between people the model explains. 1.0 = perfect, 0 = no better than guessing the average. |
| **MAE** | Mean Absolute Error: the typical size of a miss, here in HbA1c percentage points. |

---

## 3. System architecture

```
 BROWSER (React app, port 5173)            BACKEND (FastAPI, port 8000)                 STORAGE / MODELS
 ------------------------------            ----------------------------                 ----------------
 Sign up / Log in  --- /auth/* ---------->  auth.py: bcrypt password hash,  ----------> MongoDB: users
                                            7-day JWT login token

 Overview: "Log Visit" --- /update ------>  DigitalTwinEngine.update()
   (7 inputs + optional lab HbA1c)            1. validate inputs (allowed ranges)
                                              2. save the visit (Observation) in history
                                              3. merge into the current state (7 inputs)
                                              4. preprocessor.pkl  -> 10 model columns
                                              5. xgboost_hba1c.pkl -> estimated HbA1c
                                              6. shap_explainer.pkl -> why (SHAP values)
                                              7. calibrate with past lab results
                                              8. save the whole twin ------------------> MongoDB: twin_states
                                                                                         (+ predictions log)
 Predictions / Explainability -- /prediction -> read stored estimates + model accuracy (model_meta.json)
 Digital Twin timeline -------- /twin --------> read the full twin (all visits)
 What-If Simulator ------------ /simulate ----> same model, changed inputs, compare
 AI Explanation --------------- /ask ---------> retrieve 3 guideline sentences (MiniLM + FAISS)
                                                -> Gemini writes the explanation
                                                   (no API key -> template built from real numbers)
```

**Technology stack**

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts (charts), Lucide (icons) |
| Backend | Python, FastAPI, Pydantic (input validation) |
| Database | MongoDB Atlas (cloud) |
| Machine learning | XGBoost, scikit-learn (preprocessing), SHAP (explanations) |
| Retrieval (RAG) | sentence-transformers `all-MiniLM-L6-v2` (text embeddings), FAISS (similarity search) |
| LLM | Google Gemini `gemini-2.5-flash` via the `google-genai` SDK |
| Security | bcrypt password hashing, JWT tokens, per-patient access control |

---

## 4. The whole flow, step by step

This is what happens when a new patient uses the system.

**Step 1: Sign up and log in.**
The password is never stored as-is. It is hashed with **bcrypt**. At login the server returns a **JWT token** valid for 7 days, and the browser attaches it to every request. The server checks the token and only ever lets a patient see **their own** twin (anyone else gets "403 Forbidden").

**Step 2: The twin is created.**
The first time the dashboard opens, the backend creates an empty twin document for the patient in MongoDB. No values are assumed.

**Step 3: The patient logs a visit.**
The visit form asks for the **7 values the model uses** (Section 6), plus an **optional lab HbA1c** if the patient has a real result. The backend validates every value against the range seen in the training data; for example, glucose must be between 40 and 500 mg/dL. Impossible values such as 0 are rejected with a clear message.

**Step 4: The twin updates its state.**
The visit is saved as a timestamped **Observation** in the twin's history, and the values are merged into the twin's **current state**.

**Step 5: The model makes an estimate.**
The 7 inputs go through the **preprocessor**, which scales numbers and turns categories into 0/1 columns. The **XGBoost model** then outputs the estimated HbA1c.

**Step 6: SHAP explains the estimate.**
The **SHAP TreeExplainer** calculates how much each input pushed the estimate up or down. These pushes always add up exactly to the estimate.

**Step 7: Personal calibration.**
If the patient logged lab HbA1c results at *earlier* visits, the twin computes its average error for this person and shifts the new estimate by that amount. This is the **calibrated estimate**. The current visit's own lab result is never used, so the check stays honest.

**Step 8: Everything is saved.**
The updated twin, with its full history, all estimates and all what-if scenarios, is saved in MongoDB.

**Step 9: The dashboard shows the results.**
- **Predictions:** the estimate, its clinical category, the model's measured accuracy, and the history chart.
- **Explainability:** the SHAP bar chart and table.
- **Digital Twin:** the timeline of all visits, with lab results and calibration.
- **What-If:** change inputs, re-run the model, compare.
- **AI Explanation:** a plain-language summary with guideline evidence.

---

## 5. Features (the six dashboard tabs)

| Tab | What it shows | What happens behind it |
|---|---|---|
| **Overview** | Demographics, current vitals, "Log Visit" form (7 inputs + optional lab HbA1c) | Saves a visit and triggers a new estimate |
| **Predictions** | Estimated HbA1c, category badge (Normal / Prediabetes / Diabetes range), position on the clinical HbA1c scale, typical error (±0.35), calibrated estimate, chart of estimates and lab results across visits | Reads stored predictions + `models/model_meta.json` |
| **Explainability** | SHAP bar chart: red bars push the estimate up, blue bars pull it down. Plus the equation *starting point + pushes = estimate* and a table with the patient's values | SHAP TreeExplainer, grouped back into the 7 inputs |
| **Digital Twin** | Timeline of every visit: date, estimate, category, top driver, lab result, "twin was off by", calibrated estimate | Reads the twin's history from MongoDB |
| **What-If Simulator** | Sliders for BMI, waist, fasting glucose and a work-activity toggle, starting at the patient's own values; shows current vs scenario on the clinical scale | Same model re-run on the changed inputs |
| **AI Explanation** | Plain-language explanation + the 3 retrieved guideline sources | RAG: search the guideline library, then Gemini (or template mode without an API key) |

---

## 6. Datasets

### 6.1 Main dataset: NHANES 2017–2018 (used by the app)

**NHANES** (National Health and Nutrition Examination Survey) is run by the US CDC. It combines interviews, physical examinations and blood tests from a nationally representative sample. The "_J" in each file name means the 2017–2018 cycle. All files are joined on the participant ID `SEQN`.

| File | Contents | What we use from it |
|---|---|---|
| `DEMO_J.xpt` | Demographics | Age (`RIDAGEYR`), gender (`RIAGENDR`) |
| `GHB_J.xpt` | Glycohemoglobin lab test | **HbA1c (`LBXGH`), the target we predict** |
| `GLU_J.xpt` | Fasting plasma glucose (morning, fasting subgroup only) | Fasting glucose (`LBXGLU`) |
| `BMX_J.xpt` | Body measures | BMI (`BMXBMI`), waist circumference (`BMXWAIST`) |
| `PAQ_J.xpt` | Physical activity questionnaire | Vigorous work activity (`PAQ605`) |
| `SMQ_J.xpt` | Smoking questionnaire | Smoked 100+ cigarettes in life (`SMQ020`) |
| `BIOPRO_J.xpt` | Standard biochemistry profile | Merged, not used as a model input |
| `DIQ_J.xpt` | Diabetes questionnaire | Merged, not used as a model input |

**From raw data to training data**

| Stage | People |
|---|---|
| All NHANES 2017–2018 participants (215 columns after merging) | 9,254 |
| Have an HbA1c lab result (tested at age 12+) | 6,045 |
| Have **both** HbA1c and fasting glucose → **final training data** | **2,887** |

We keep only people with a *measured* fasting glucose. The app always asks for glucose, so the model should learn from real glucose values. Otherwise 52% of the glucose values would have been filled in with a guess.

**Profile of the 2,887 people:**
- **Demographics:** ages 12–80 (mean 45.8), 52% female.
- **Average measurements:** BMI 29.0, waist 97.7 cm, fasting glucose 111.8 mg/dL.
- **HbA1c:** mean 5.79%, range 3.8–15.2%. 60% are in the normal range, 27% in the prediabetes range, and 13% in the diabetes range.

### 6.2 Second dataset: UCI "Diabetes 130-US Hospitals" (research notebooks only)

- **What it is:** `diabetic_data.csv` holds 101,766 hospital encounters × 50 columns, from 130 US hospitals (1999–2008). `IDS_mapping.csv` explains the ID codes.
- **Task:** predict whether a diabetic patient is **readmitted** to hospital.
- **How we used it:** explored and benchmarked in notebooks 01–03. We split by patient so no patient appears in both the training and test sets. It is **not used by the app**, because it answers a different question (hospital readmission, not HbA1c) and has no HbA1c values to train on.

---

## 7. The 7 model inputs and the target

| # | Input | NHANES code | Type | Accepted values |
|---|---|---|---|---|
| 1 | Age | `RIDAGEYR` | number | 12–80 years |
| 2 | Gender | `RIAGENDR` | category | 1 = male, 2 = female |
| 3 | BMI | `BMXBMI` | number | 12–90 kg/m² |
| 4 | Waist circumference | `BMXWAIST` | number | 50–180 cm |
| 5 | Fasting glucose | `LBXGLU` | number | 40–500 mg/dL |
| 6 | Vigorous activity at work | `PAQ605` | yes/no | 1 = yes, 2 = no |
| 7 | Smoked 100+ cigarettes in life | `SMQ020` | yes/no | 1 = yes, 2 = no |

**Target:** HbA1c in % (`LBXGH`), predicted as a continuous number (a regression task).

---

## 8. How the AI model works

### 8.1 Preprocessing (`models/preprocessor.pkl`)
1. **Codes 7 and 9** ("refused" / "don't know" in the questionnaires) are treated as missing, not as real answers.
2. **Missing numbers** are filled with the median; **missing categories** with the most common answer.
3. **Numbers** are standardized (z-score).
4. **Categories** are one-hot encoded: each answer becomes its own 0/1 column.
5. Result: **7 inputs become 10 model columns.**

### 8.2 The model: XGBoost (`models/xgboost_hba1c.pkl`)
XGBoost builds **300 small decision trees** (each at most 3 levels deep), one after another. The first tree makes a rough guess, and each following tree learns to correct the mistakes still left. Each correction is scaled down by a learning rate of 0.05, so no single tree dominates. The final estimate is the starting average plus all the corrections.

**Monotonic constraints (a key design decision).** We told the model that when age, BMI, waist or glucose go **up**, the estimate may only go **up or stay the same**, never down. This matches medical knowledge. It also makes the What-If Simulator trustworthy: losing weight can never raise the estimate. Without the constraint, the old model did exactly that for BMI 30 → 25.

### 8.3 Honest training procedure (`backend/ml/train_and_save.py`)
1. Split the 2,887 people: **80% for training (2,309), 20% for testing (578)**. The test people are never shown to the model during training.
2. Train XGBoost and three comparison models on the training part and score all of them on the test part (results in Section 12).
3. Save the scores to `models/model_meta.json`. The app shows them to users ("typical error ±0.35").
4. Retrain the final model on all 2,887 people for deployment (standard practice once evaluation is done).

### 8.4 Explainability: SHAP (`models/shap_explainer.pkl`)
SHAP comes from game theory (Shapley values). It asks: *how much did each input contribute to this particular estimate?*

- **Starting point:** the model's average estimate for everyone, **5.79%**.
- **Pushes:** each of the patient's inputs pushes the number up (+) or down (−).
- **Exactness:** the pushes **add up exactly** to the patient's estimate. We verify this automatically in the tests.

**Worked example** (a 52-year-old woman, fasting glucose 124 mg/dL):
```
Starting point (average estimate)       5.79%
+ Fasting glucose (124 mg/dL)          +0.28
+ Age (52 years)                       +0.10
+ Gender, BMI, waist, smoking, work    +0.01 (combined)
= Her estimate                          6.18%  -> prediabetes range
```
We use **TreeExplainer**, which computes exact SHAP values quickly for tree models. SHAP explains *how the model reasoned*. It does not prove medical cause and effect.

### 8.5 What-If Simulator
The simulator copies the patient's current state, replaces the changed inputs, runs **the same model** again, and shows the difference. It answers: *"according to patterns learned from 2,887 real people, what would the estimate be with these values?"* The results are **associations, not guaranteed effects**, and the app says so.

### 8.6 Personal calibration (the "twin learns from the real patient" part)
When a patient logs real lab HbA1c results, the twin computes its average gap for that person (lab minus estimate) over earlier visits and adds it to new estimates. Example from our test run:
- **Visit 1:** the twin estimated 6.49%, and the patient's lab result was 6.60%, a gap of +0.11.
- **Visit 2:** the model estimated 6.18%, so the **calibrated estimate** is 6.18 + 0.11 ≈ **6.30%**.

### 8.7 AI explanation with RAG
1. **Build the question** from the patient's top SHAP drivers, e.g. "fasting glucose, age and HbA1c".
2. **Search.** The **MiniLM** model turns the question and each guideline sentence into 384 numbers (an embedding), and **FAISS** finds the 3 closest sentences.
3. **Write.** The patient's values, the estimate, the SHAP drivers, the latest what-if result and the 3 guideline sentences go to **Gemini**. Gemini is instructed not to diagnose or invent facts.
4. **Fallback.** Without an API key, or if Gemini can't be reached, the app shows a **template explanation** built from the patient's real numbers, labelled "Template mode".

---

## 9. Security and engineering quality

- **Passwords:** hashed with bcrypt, never stored in plain text.
- **Logins:** signed JWT tokens using a random secret, stored in `.env` and never in code.
- **Access control:** a patient can only read or change their own twin. Anyone else gets 403 Forbidden.
- **Input validation:** every value is checked against the training data's range on the backend (Pydantic) and in the form.
- **Automated tests:** 17 unit tests, which need no database.
- **Reproducible setup:** `requirements.txt` pins the exact library versions the model files were created with.

---

## 10. Is it really a digital twin?

A widely cited classification (Kritzinger et al., 2018) has three levels:
- **Digital model:** a virtual copy updated by hand.
- **Digital shadow:** real-world data flows into the copy automatically.
- **Digital twin:** data flows both ways, and the copy can simulate and feed back into the real object.

Our system:
- **Has:** a persistent per-patient virtual state with full history, model-based simulation (What-If), explanations, and **feedback from the real patient** (lab-result calibration).
- **Does not yet have:** automatic data feeds (from wearables or hospital records) or forecasting of *future* values. The public data measures each person only once, so it contains no information about how people change over time.

**Honest positioning for the talk:** *"A patient-state digital twin prototype with an explainable HbA1c estimator, model-based what-if simulation and personal calibration from lab results."*

---

## 11. Research notebooks (the path to the final model)

| Notebook | What it does |
|---|---|
| `01_data_exploration` | Loads and merges the 8 NHANES files (9,254 × 215) and the UCI data (101,766 × 50) |
| `02_feature_engineering` | Selects the 7 inputs, builds the preprocessing pipeline; UCI split by patient to avoid leakage |
| `03_model_benchmark` | Compares 6 regression models (NHANES) and 3 classifiers (UCI) |
| `04_shap_analysis` | Global SHAP summary plot and a single-patient waterfall plot |
| `05_counterfactual_analysis` | Replays a patient over 4 visits through the digital twin engine and runs a what-if scenario |

---

## 12. Results

### 12.1 Main result: accuracy on 578 people the model never saw

| Model | R² | Typical error (MAE) | RMSE |
|---|---|---|---|
| No model (always guess the average) | 0.00 | 0.65 | 1.08 |
| Linear regression, glucose only | 0.76 | 0.37 | 0.53 |
| Linear regression, all 7 inputs | 0.77 | 0.35 | 0.52 |
| **XGBoost, deployed model** | **0.77** | **0.35** | **0.52** |

**What this means:**
- The model explains **77%** of the differences in HbA1c between people.
- A typical estimate is within **±0.35 percentage points** of the real lab value.
- **80%** of estimates are within ±0.5 points of the lab value, and **53%** are within ±0.25.
- XGBoost and linear regression are essentially **tied**. We report this openly (Section 12.7).
- **5-fold cross-validation** (training 5 times on different splits) gives a more conservative **R² 0.72 ± 0.06**, with the typical error stable at **0.36 ± 0.01**. Train R² (0.773) ≈ test R² (0.769), so the model is not overfitting. Full details are in [RESULTS.md](RESULTS.md).

### 12.2 Clinical usefulness (same 578 unseen people)

| Question | Result |
|---|---|
| Same clinical category as the lab test (normal / prediabetes / diabetes)? | **76%** of people |
| Of people whose lab HbA1c is in the **diabetes range (≥ 6.5%)**, how many did the model flag? | **56 of 67 = 84% sensitivity** |
| Of people **not** in the diabetes range, how many were correctly *not* flagged? | **98% specificity** |
| When the model says "diabetes range", how often is the lab value really ≥ 6.5%? | **88% precision** |
| Of people at **least prediabetes (≥ 5.7%)**, how many were flagged? | 61% sensitivity, 89% specificity |

The model is strong at identifying diabetes-range values and weaker at the fine line between normal and prediabetes. That band is less than one point wide (5.7–6.4%), close to the model's typical error.

### 12.3 Improvement over the first version (measured on the same 578 people)

| Version | R² | MAE |
|---|---|---|
| v1.0: initial model (trained on everyone, half the glucose values median-filled, no constraints) | 0.725 | 0.374 |
| **v1.1: final model** (trained on measured glucose only, monotonic constraints, codes cleaned) | **0.769** | **0.346** |

The error dropped by about 8%, and the What-If Simulator became logically consistent: raising a risk input can never lower the estimate.

### 12.4 Which inputs matter most (global SHAP importance, deployed model)

| Input | Average impact (HbA1c points) | Share |
|---|---|---|
| Fasting glucose | 0.509 | **65%** |
| Age | 0.154 | 20% |
| Waist circumference | 0.038 | 5% |
| BMI | 0.030 | 4% |
| Gender | 0.029 | 4% |
| Smoked 100+ cigarettes | 0.018 | 2% |
| Vigorous work activity | 0.000 | 0% |

**Finding:** fasting glucose dominates, followed by age. This makes medical sense, because HbA1c and fasting glucose both measure blood sugar. It also matches the known near-linear relationship between HbA1c and average glucose (the ADAG study). Once glucose is known, lifestyle factors add little extra information.

### 12.5 Example patients (real outputs of the deployed system)

| Patient | Estimate | Category | Top drivers | What-if: BMI −4 and waist −10 cm | What-if: glucose −30 mg/dL |
|---|---|---|---|---|---|
| A: healthy woman, 30, glucose 88 | 5.14% | Normal | Glucose −0.43, Age −0.17 | +0.00 | −0.09 |
| B: woman, 52, BMI 32, glucose 124 | 6.18% | Prediabetes | Glucose +0.28, Age +0.10 | −0.07 | **−0.65** |
| C: man, 60, BMI 35, glucose 180 | 7.68% | Diabetes range | Glucose +1.80, Age +0.11 | −0.01 | **−0.55** |

**Finding:** in the model's learned associations, lowering glucose moves the estimate far more than weight changes do. Weight loss mostly helps HbA1c *through* lowering blood glucose, and the model sees glucose directly.

### 12.6 Initial benchmark from notebook 03 (all 6,045 people, glucose median-filled for half)

| Model | R² | MAE |
|---|---|---|
| Linear Regression | 0.380 | 0.441 |
| Ridge | 0.380 | 0.441 |
| Lasso | 0.000 | 0.601 |
| ElasticNet | 0.084 | 0.577 |
| Random Forest | 0.343 | 0.474 |
| XGBoost | 0.296 | 0.479 |

These scores are much lower than in 12.1 because **half of these people had no measured glucose**. Without glucose, no model can estimate HbA1c well (R² only about 0.12). This finding is why the final model is trained only on people with measured glucose, and why the app always asks for it.

**Secondary task, UCI hospital readmission (notebook 03):**

| Model | Accuracy | ROC-AUC |
|---|---|---|
| Logistic Regression | 0.620 | 0.654 |
| Random Forest | 0.583 | 0.608 |
| XGBoost | 0.624 | **0.663** |

Readmission turned out to be hard to predict from the available fields (ROC-AUC 0.66, where 0.5 would be random guessing). We therefore focused the product on HbA1c.

### 12.7 Why XGBoost, if linear regression is just as accurate?

- **Accuracy is tied:** XGBoost has a slightly lower MAE, and linear regression a slightly higher R².
- **XGBoost gives exact SHAP explanations** through TreeExplainer.
- **Monotonic constraints** keep the What-If Simulator medically consistent.
- **It can capture non-linear effects**, such as the steep rise of HbA1c at very high glucose.

We report the linear baseline openly, because honest benchmarking is part of explainable AI.

### 12.8 System verification

| Check | Result |
|---|---|
| Automated unit tests (SHAP adds up exactly, monotonic behaviour, validation, calibration) | **17 / 17 passed** |
| End-to-end API checks against the live server and database | **23 / 23 passed** |
| Access control: another patient's twin returns 403, a forged token returns 401 | Passed |
| Frontend production build and TypeScript check | Passed |
| Real-browser test of all 6 tabs (light mode, dark mode, phone width) | No errors |

---

## 13. Limitations and future work

**Limitations**
- The model estimates **current** HbA1c. It cannot forecast the future, because NHANES measures each person only once.
- **Fasting glucose is required** and provides most of the predictive power. Lifestyle factors add little once glucose is known.
- What-if results are **associations**, not proof that a change will cause an effect.
- NHANES survey weights were not used, so the results are not weighted to the US population. The data is also US-only.
- The guideline library for RAG is small (5 curated sentences).
- The system is **not a diagnostic device**. A lab HbA1c test is still required.

**Future work**
- Train on **longitudinal data** (the same patients over years) to forecast future HbA1c.
- Connect wearables or hospital records for automatic updates, completing the two-way digital twin loop.
- Add more inputs (for example medications, diet, family history).
- Expand the RAG library with full clinical guidelines, and add uncertainty ranges to every estimate.

---

## 14. Presentation guide

### 14.1 Suggested talk outline (about 8–10 minutes)

| # | Topic | Main point |
|---|---|---|
| 1 | Problem | Diabetes is detected late, and patients don't understand their risk |
| 2 | Solution | A digital twin that estimates, explains, simulates and learns |
| 3 | Architecture | React + FastAPI + MongoDB + XGBoost + SHAP + RAG/Gemini (Section 3) |
| 4 | Data | NHANES: 9,254 → 6,045 → 2,887 people; 7 inputs; target HbA1c |
| 5 | Model | XGBoost with monotonic constraints; honest 80/20 evaluation |
| 6 | Explainability | SHAP: starting point + pushes = estimate (worked example) |
| 7 | **Live demo** | Section 14.2 |
| 8 | **Results** | R² 0.77, ±0.35, 84% sensitivity / 98% specificity, improvement over v1.0 |
| 9 | Limitations and future | Cross-sectional data; longitudinal forecasting next |

### 14.2 Live demo script

Start both servers (see README), open **http://localhost:5173** and register a new account.

1. **Overview:** log the first visit.
   - **Inputs:** age 52, female, BMI 33.5, glucose 131, waist 108, vigorous work *No*, smoked *Yes*.
   - **Lab HbA1c:** 6.6.
   - **Expected:** an estimate of about **6.49%**, in the prediabetes range.
2. **Predictions:** point out the estimate, the category badge, the clinical scale, and "typical error ±0.35 on 578 unseen people".
3. **Explainability:** read the equation *starting point + pushes = estimate*. Point out that glucose is the biggest red bar.
4. **Overview:** log a second visit with BMI 32 and glucose 124, leaving the lab field empty.
   - **Expected:** an estimate of about **6.18%**, with a **calibrated estimate of about 6.30%** (learned from visit 1's lab result).
5. **Digital Twin:** show the timeline: visit 1 with its lab result and "off by 0.11", then the current state with its calibrated estimate.
6. **What-If:** run two scenarios.
   - **BMI 27 and waist 96:** only a small change (about **−0.07**).
   - **Press Reset, then set glucose to 94:** a large change (about **−0.65**). Explain why (Section 12.5).
7. **AI Explanation:** click *Generate Insight* and show the explanation and the 3 guideline sources.
8. **Dark mode:** toggle the moon icon.

Note: without a `GEMINI_API_KEY` in `.env`, the AI tab shows "Template mode". That's fine for a demo: it is built from the patient's real numbers. Add a key beforehand for Gemini-written text.

### 14.3 Likely questions and answers

**Q: Is this really a digital twin?**
It is a patient-state digital twin prototype. It keeps a persistent virtual copy of the patient with full history, simulates changes with the model, and learns from the real patient through lab-result calibration. What's missing for a full twin is automatic data feeds and future forecasting, which need longitudinal data (Section 10).

**Q: Why does fasting glucose dominate?**
HbA1c *is* a measure of average blood sugar, and fasting glucose is a snapshot of blood sugar. The two are strongly linked. SHAP confirms the model learned this known relationship, which is a good sign that it behaves sensibly.

**Q: Why not use linear regression, since it's just as accurate?**
Accuracy is tied, and we show that openly. We chose XGBoost for exact SHAP explanations, monotonic constraints that keep what-if results medically consistent, and the ability to capture non-linear effects (Section 12.7).

**Q: How do you know the model isn't overfitting or leaking data?**
We scored it on 578 people who were never used in training, and the preprocessing was fitted on the training part only. The final model is retrained on all data only after evaluation.

**Q: Why train only on people with measured glucose?**
The app always asks for glucose. For the other 52% of people, glucose would have been a filled-in guess, and that weakened the model (see 12.3 and 12.6).

**Q: What do R² 0.77 and MAE 0.35 mean in practice?**
The model explains 77% of the differences in HbA1c between people, and a typical estimate is within about a third of a percentage point of the lab value. 80% of estimates are within half a point.

**Q: Can the what-if simulator tell a patient what will happen if they lose weight?**
No. It shows what the model *associates* with those values in the population data, not a guaranteed personal effect. The app states this next to every result.

**Q: How is SHAP "exact"?**
SHAP values always add up to the prediction: starting point + all pushes = estimate. Our automated tests check this for every estimate.

**Q: What happens to patient data? Is it secure?**
Passwords are hashed with bcrypt, logins use signed tokens, and each patient can only access their own twin. Inputs are validated on the server.

**Q: What was the second (UCI) dataset for?**
We explored hospital-readmission prediction. The best model reached ROC-AUC 0.66, which is modest, so we focused the product on HbA1c, where the data supports a much stronger model.

**Q: Could this replace a lab test?**
No. It is a decision-support and education tool, and the app labels every result "model estimate, not a diagnosis".

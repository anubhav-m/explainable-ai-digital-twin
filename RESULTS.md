# Results: Explainable AI Digital Twin (HbA1c Estimation)

This document reports what the final model is, what data it was trained on, how the data was split, and every result we measured, with an explanation of what each result means and why it looks the way it does.

All numbers come from the project's real data (NHANES 2017–2018) and the deployed model files in `models/` (version 1.1.0). They can be reproduced with `python -m backend.ml.train_and_save`, whose output is saved in `models/model_meta.json`.

---

## 1. Summary at a glance

| | |
|---|---|
| **Task** | Estimate a person's current **HbA1c** (%) from 7 routine measurements (regression) |
| **Final model** | **XGBoost regressor** with monotonic constraints (300 trees, depth 3, learning rate 0.05) |
| **Explainability** | SHAP TreeExplainer (exact per-patient explanations) |
| **Training data** | **NHANES 2017–2018** (US CDC): **2,887 people** with both HbA1c and fasting glucose measured |
| **Split** | **80% training (2,309 people) / 20% test (578 people)**, random split with seed 42; final model retrained on all 2,887 |
| **Accuracy on the test set** | **R² = 0.769, MAE = 0.346, RMSE = 0.519** |
| **5-fold cross-validation** | R² = **0.719 ± 0.060**, MAE = **0.361 ± 0.012** |
| **Clinical result** | Catches **84%** of people with diabetes-range HbA1c (≥ 6.5%) at **98% specificity** |
| **Estimates within ±0.5 points of the lab value** | **80%** |

---

## 2. The final model

### 2.1 What it is
The final model is an **XGBoost regressor** (`models/xgboost_hba1c.pkl`), trained by `backend/ml/train_and_save.py`.

XGBoost builds many small decision trees one after another. Each new tree corrects the errors of the trees before it. The final estimate is the average HbA1c plus the sum of all the trees' corrections.

| Setting | Value | Meaning |
|---|---|---|
| `n_estimators` | 300 | number of trees |
| `max_depth` | 3 | each tree asks at most 3 questions, so it stays simple |
| `learning_rate` | 0.05 | each tree's correction is scaled down, so no single tree dominates |
| `objective` | squared error | the model minimizes the squared difference from the true HbA1c |
| `monotone_constraints` | age, BMI, waist, glucose = +1 | if any of these goes up, the estimate can only go up or stay the same |
| `random_state` | 42 | makes training reproducible |

### 2.2 Why XGBoost is the final model
1. **Accuracy.** It is as accurate as the best alternative (linear regression), with the lowest test error (MAE 0.346). Section 5 has the comparison.
2. **Exact explanations.** SHAP's TreeExplainer gives exact, fast explanations for tree models. That is the core of an *explainable* AI system.
3. **Medically consistent behaviour.** Monotonic constraints guarantee, for example, that a lower BMI can never raise the estimate. The What-If Simulator relies on this.
4. **Non-linear effects.** Trees can capture non-linear relationships, such as HbA1c rising steeply at very high glucose.

We report openly that linear regression performs equally well (Sections 5 and 7). With this data, the choice of model matters much less than the choice of inputs, especially fasting glucose.

### 2.3 Companion files

| File | Role |
|---|---|
| `models/preprocessor.pkl` | Fills missing values, scales numbers, one-hot encodes categories (7 inputs become 10 columns) |
| `models/xgboost_hba1c.pkl` | The trained XGBoost model |
| `models/shap_explainer.pkl` | SHAP TreeExplainer for the model |
| `models/feature_names.pkl` | The 10 model column names, in order |
| `models/model_meta.json` | Model version, training date, number of rows, test scores |

---

## 3. The training dataset

### 3.1 Source
**NHANES 2017–2018** (National Health and Nutrition Examination Survey) is run by the US Centers for Disease Control and Prevention (CDC). It combines interviews, physical examinations and laboratory tests. Eight files were joined on the participant ID `SEQN`:

| File | What we used |
|---|---|
| `DEMO_J.xpt` (demographics) | age, gender |
| `GHB_J.xpt` (glycohemoglobin) | **HbA1c: the target** |
| `GLU_J.xpt` (fasting glucose) | fasting plasma glucose |
| `BMX_J.xpt` (body measures) | BMI, waist circumference |
| `PAQ_J.xpt` (physical activity) | vigorous activity at work (yes/no) |
| `SMQ_J.xpt` (smoking) | smoked 100+ cigarettes in life (yes/no) |
| `BIOPRO_J.xpt`, `DIQ_J.xpt` | merged, not used as inputs |

### 3.2 From raw data to training data

| Step | People | Why |
|---|---|---|
| All participants after merging 8 files (215 columns) | 9,254 | full survey |
| Keep people with an HbA1c lab result | 6,045 | we cannot learn without the target (HbA1c is tested at age 12+) |
| Keep people with a **measured** fasting glucose | **2,887** | glucose is only measured in the morning fasting subgroup. The app always asks for glucose, so the model must learn from real glucose values, not filled-in guesses. |

**Data cleaning:** answers coded 7 ("refused") or 9 ("don't know") in the questionnaires were treated as missing.

**Missing values remaining in the 2,887 people** (filled by the preprocessor with the median, or the most common answer for categories):

| Input | Missing |
|---|---|
| Age, gender, fasting glucose | 0% |
| BMI | 1.7% |
| Waist | 4.8% |
| Vigorous work activity | 12.3% |
| Smoking | 12.2% |

**Profile of the 2,887 people:**
- **Demographics:** ages 12–80 (mean 45.8), 52% female.
- **Average measurements:** BMI 29.0, waist 97.7 cm, glucose 111.8 mg/dL.
- **HbA1c:** mean 5.79%, range 3.8–15.2%.

### 3.3 The 7 inputs and the target

| Input | Code | Type |
|---|---|---|
| Age | `RIDAGEYR` | number (years) |
| Gender | `RIAGENDR` | category (male / female) |
| BMI | `BMXBMI` | number (kg/m²) |
| Waist circumference | `BMXWAIST` | number (cm) |
| Fasting glucose | `LBXGLU` | number (mg/dL) |
| Vigorous activity at work | `PAQ605` | yes / no |
| Smoked 100+ cigarettes | `SMQ020` | yes / no |
| **Target: HbA1c** | `LBXGH` | number (%) |

---

## 4. How the data was split and evaluated

### 4.1 Train/test split
- **Method:** a random split of the 2,887 people with `train_test_split(test_size=0.2, random_state=42)`.
- **Training set:** **2,309 people (80%)**, used to fit the preprocessor and the model.
- **Test set:** **578 people (20%)**, never seen during training, used only to measure accuracy.
- **No leakage:** the preprocessor (medians, scaling) is fitted on the training set only, so no information from the test set reaches the model.
- **Deployment:** after evaluation, the final model is retrained on all 2,887 people. This is standard practice: evaluate on held-out data, then use all the data for the deployed model.

**The two sets are similar** (checked by clinical category, using ADA cut-offs):

| Set | People | Mean HbA1c | Normal (< 5.7) | Prediabetes (5.7–6.4) | Diabetes range (≥ 6.5) |
|---|---|---|---|---|---|
| Training | 2,309 | 5.79% | 1,365 (59%) | 636 (28%) | 308 (13%) |
| Test | 578 | 5.75% | 359 (62%) | 152 (26%) | 67 (12%) |

### 4.2 Extra check: 5-fold cross-validation
A single split can be lucky or unlucky. To check stability, we also ran **5-fold cross-validation**: the 2,887 people are split into 5 parts, and the model is trained 5 times, each time tested on a different part (Section 7).

### 4.3 Metrics used

| Metric | Meaning | Good value |
|---|---|---|
| **R²** | Share of the differences in HbA1c between people that the model explains | closer to 1 |
| **MAE** | Mean Absolute Error: the typical miss, in HbA1c percentage points | closer to 0 |
| **RMSE** | Root Mean Squared Error: like MAE, but punishes large misses more | closer to 0 |
| **Sensitivity** | Of people who truly are in a category, how many the model flags | higher |
| **Specificity** | Of people who are *not* in it, how many the model correctly does not flag | higher |
| **Precision** | When the model flags someone, how often it is right | higher |

---

## 5. Result 1: model comparison on the test set (578 people)

| Model | R² | MAE | RMSE |
|---|---|---|---|
| No model (always guess the training average) | −0.002 | 0.646 | 1.082 |
| Linear regression using **glucose only** | 0.757 | 0.371 | 0.533 |
| Linear regression using all 7 inputs | **0.772** | 0.352 | **0.516** |
| **XGBoost, final model** | 0.769 | **0.346** | 0.519 |

**What it shows**
- **The model clearly learns something.** It cuts the typical error from 0.65 (guessing the average) to **0.35**, nearly half.
- **Glucose alone gets almost the whole way** (R² 0.757). The other 6 inputs add only about 0.01–0.02.
- **XGBoost and linear regression are tied.** XGBoost has the lowest MAE, and linear regression the highest R², by tiny margins.

**Why:** HbA1c is a 3-month average of blood sugar, and fasting glucose is a direct blood-sugar measurement, so they are strongly linked. The relationship is close to a straight line (as the well-known ADAG study found), so a simple linear model already captures most of it.

---

## 6. Result 2: overfitting check

| Data | R² | MAE | RMSE |
|---|---|---|---|
| Training set (2,309 people the model learned from) | 0.773 | 0.337 | 0.502 |
| Test set (578 unseen people) | 0.769 | 0.346 | 0.519 |

**What it shows:** the model performs almost identically on data it has seen and data it hasn't, so **it is not overfitting** (not memorizing the training people).

**Why:** the trees are shallow (depth 3), the learning rate is small (0.05), and the monotonic constraints stop the model from learning noisy, zig-zag patterns.

---

## 7. Result 3: 5-fold cross-validation (all 2,887 people)

| Model | R² (mean ± std) | MAE (mean ± std) |
|---|---|---|
| **XGBoost (final settings)** | **0.719 ± 0.060** | **0.361 ± 0.012** |
| Linear regression | 0.724 ± 0.063 | 0.364 ± 0.014 |

The R² of the 5 XGBoost folds were 0.769, 0.650, 0.643, 0.753 and 0.781.

**What it shows**
- **MAE is very stable across folds** (0.36 ± 0.01). The typical error is reliably about a third of a percentage point.
- **R² varies more** (0.64–0.78). R² depends on how spread out the test people's HbA1c values are: a fold with more extreme diabetic values has more to explain.
- **Our test split scored at the upper end.** Its R² of 0.769 is above the cross-validation average, so the more conservative figure to quote is **R² ≈ 0.72** (range 0.64–0.78).
- **Cross-validation confirms the tie.** XGBoost and linear regression score the same here too.

---

## 8. Result 4: size of the errors (test set)

| Measure | Value |
|---|---|
| Estimates within ±0.25 points of the lab value | **52.9%** |
| Estimates within ±0.5 points | **80.3%** |
| Estimates within ±1.0 point | **94.1%** |
| Median absolute error | 0.229 |
| 90% of errors are smaller than | 0.729 |
| Largest single error | 3.84 |
| Average bias (estimate − lab) | +0.019 (almost none) |

**What it shows:** half of the estimates are within a quarter of a point, and 94% are within one point. On average the model neither over- nor under-estimates.

The few large errors come from people with very high HbA1c (up to 15%). They are rare in the data, and a single fasting glucose snapshot can differ a lot from a person's 3-month average.

---

## 9. Result 5: accuracy per clinical group (test set)

| People whose lab HbA1c is… | People | MAE | Average error (estimate − lab) |
|---|---|---|---|
| Normal (< 5.7) | 359 | 0.272 | **+0.158** (slightly too high) |
| Prediabetes (5.7–6.4) | 152 | 0.292 | **−0.186** (slightly too low) |
| Diabetes range (≥ 6.5) | 67 | 0.864 | **−0.257** (too low) |

**What it shows**
- **Normal and prediabetes are accurate:** errors of about 0.3.
- **The diabetes range is harder:** errors of about 0.9.
- **Estimates are pulled toward the middle.** Low values are over-estimated and high values under-estimated.

**Why:** this is called **regression to the mean**. A model trained to minimize squared error on data where most people are near 5.5% plays it safe and pulls extreme cases toward the average. People with diabetes also vary much more (for example, some take glucose-lowering medication), and they make up only 13% of the training data.

---

## 10. Result 6: clinical category agreement (test set)

**Confusion matrix:** each row shows people by their real lab category, and each column shows the category the model gave them.

| Lab says ↓ / Model says → | Normal | Prediabetes | Diabetes range | Correct |
|---|---|---|---|---|
| **Normal** (359) | **319** | 36 | 4 | **89%** |
| **Prediabetes** (152) | 82 | **66** | 4 | **43%** |
| **Diabetes range** (67) | 4 | 7 | **56** | **84%** |

**Overall agreement: 441 of 578 people = 76.3%.**

**Screening performance at the two clinical cut-offs**

| Cut-off | Sensitivity | Specificity | Precision |
|---|---|---|---|
| Diabetes range (≥ 6.5%) | **84%** (56 of 67) | **98%** | **88%** |
| At least prediabetes (≥ 5.7%) | 61% (133 of 219) | 89% | 77% |

**What it shows**
- **Diabetes-range detection is strong.** 84% are caught, and false alarms are rare: only 8 of 511 people were wrongly flagged.
- **Normal is recognized well** (89%).
- **Prediabetes is the weak spot.** Only 43% are labelled correctly, and most of the rest (82 people) are labelled normal.

**Why prediabetes is hard:** the prediabetes band is only 0.8 points wide (5.7–6.4%), just over twice the model's typical error of 0.35. Many prediabetic people sit close to 5.7%, and the model's pull toward the average (Section 9) nudges them just below the cut-off. For people near a boundary, a lab test is always needed. This is why the app labels every result "model estimate, not a diagnosis".

---

## 11. Result 7: how each design decision changed the result (ablation study)

All five versions were tested on **the same 578 test people**, adding one change at a time:

| # | Version | R² | MAE | RMSE |
|---|---|---|---|---|
| 1 | **Initial model v1.0:** trained on all 5,467 other people (half with median-filled glucose), raw questionnaire codes, 100 trees of depth 5, no constraints | 0.725 | 0.374 | 0.567 |
| 2 | + treat codes 7/9 ("refused/don't know") as missing | 0.718 | 0.375 | 0.574 |
| 3 | + train only on people with **measured glucose** (2,309) | 0.753 | 0.358 | 0.537 |
| 4 | + **monotonic constraints** | 0.759 | 0.350 | 0.530 |
| 5 | + shallower, slower trees (depth 3, lr 0.05, 300 trees): **final v1.1** | **0.769** | **0.346** | **0.519** |

**What it shows:** from v1.0 to the final model, R² improved from **0.725 to 0.769** and MAE dropped by **7.5%** (0.374 → 0.346).

| Change | Effect | Reason |
|---|---|---|
| Training on measured glucose (step 3) | **Biggest gain** (+0.028 R²) | In v1.0, over half the training people had glucose filled in as "102", which taught the model a false pattern |
| Monotonic constraints (step 4) | Improved accuracy (+0.006 R²) | Also makes the What-If Simulator logical: v1.0 raised the estimate when BMI fell from 30 to 25 |
| Simpler trees (step 5) | +0.010 R² | Smoother, less noisy predictions |
| Cleaning codes 7/9 (step 2) | Tiny change in accuracy | Done for **correctness**: "don't know" should not be treated as a real answer |

---

## 12. Result 8: which inputs matter most (SHAP, final model)

The average size of each input's push on the estimate, over the test people:

| Input | Average push (HbA1c points) | Share of total |
|---|---|---|
| **Fasting glucose** | 0.509 | **65%** |
| **Age** | 0.154 | **20%** |
| Waist circumference | 0.038 | 5% |
| BMI | 0.030 | 4% |
| Gender | 0.029 | 4% |
| Smoked 100+ cigarettes | 0.018 | 2% |
| Vigorous work activity | 0.000 | 0% |

**What it shows:** the model relies mostly on **glucose (65%)** and **age (20%)**. Body-size measurements matter a little, and work activity not at all.

**Why:**
- **Glucose:** fasting glucose is a direct measurement of blood sugar, which is what HbA1c reflects.
- **Age:** HbA1c naturally rises with age, even in people without diabetes.
- **BMI and waist:** they affect HbA1c mainly *through* blood glucose. Once glucose is known, they add little new information.
- **Work activity:** a single yes/no question about work is too weak a signal.

**SHAP correctness check:** the SHAP base value (average estimate) is **5.786%**. For every patient, base value + all SHAP pushes = the estimate, exactly. This is verified by the automated tests.

---

## 13. Result 9: example patients and What-If behaviour (deployed system)

| Patient | Estimate | Category | Main SHAP drivers | What-if: BMI −4 and waist −10 cm | What-if: glucose −30 mg/dL |
|---|---|---|---|---|---|
| A: woman, 30, BMI 23, glucose 88 | 5.14% | Normal | glucose −0.43, age −0.17 | +0.00 | −0.09 |
| B: woman, 52, BMI 32, glucose 124 | 6.18% | Prediabetes | glucose +0.28, age +0.10 | −0.07 | **−0.65** |
| C: man, 60, BMI 35, glucose 180 | 7.68% | Diabetes range | glucose +1.80, age +0.11 | −0.01 | **−0.55** |

**What it shows**
- **Sensible estimates:** the healthy person is normal, the at-risk person is in prediabetes, and the high-glucose person is in the diabetes range.
- **Weight versus glucose:** in the model's learned associations, lowering glucose moves the estimate far more than weight loss does. For patient B it is −0.65 against −0.07; for patient C, −0.55 against −0.01.
- **Monotonic guarantee:** no scenario that lowers a risk input ever raises the estimate.

Note: what-if results are **associations** learned from population data, not a guarantee of what will happen to one person.

**Personal calibration example** (from the end-to-end test):
- **Visit 1:** the model estimated **6.49%**, and the patient's lab result was **6.60%**, a gap of +0.11.
- **Visit 2:** the model estimated 6.18%, so the twin's **calibrated estimate** was **6.30%** (6.18 + 0.11).

---

## 14. Result 10: initial benchmark (notebook `03_model_benchmark`)

Before the final design, six models were compared on **all 6,045 people**, including those without a measured glucose (their glucose was median-filled):

| Model | R² | MAE | RMSE |
|---|---|---|---|
| Linear Regression | 0.380 | 0.441 | 0.778 |
| Ridge | 0.380 | 0.441 | 0.778 |
| Lasso | −0.000 | 0.601 | 0.989 |
| ElasticNet | 0.084 | 0.577 | 0.946 |
| Random Forest | 0.343 | 0.474 | 0.801 |
| XGBoost (50 trees) | 0.296 | 0.479 | 0.829 |

**Why these scores are much lower than the final result (0.38 vs 0.77):**
- **Missing glucose.** For **52%** of these people glucose was missing and replaced by a single median value, and the model cannot estimate HbA1c well without glucose. On those people, R² was only about **0.12**.
- **Lasso and ElasticNet failed.** Their default regularization shrinks almost all inputs to zero, so they barely beat guessing the average.

**Decision taken:** this benchmark showed that **measured glucose is essential**. The final model is therefore trained only on people with measured glucose, and the app requires glucose as an input.

---

## 15. Result 11: secondary task, hospital readmission (UCI dataset, notebook 03)

- **Data:** the UCI "Diabetes 130-US Hospitals" dataset, 101,766 hospital encounters.
- **Target:** whether the patient was readmitted.
- **Split:** by patient, so the same patient is never in both the training and test sets (81,477 training / 20,289 test encounters).

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 0.620 | 0.630 | 0.388 | 0.480 | 0.654 |
| Random Forest | 0.583 | 0.543 | 0.502 | 0.522 | 0.608 |
| **XGBoost** | **0.624** | 0.607 | 0.477 | **0.534** | **0.663** |

**What it shows:** readmission is hard to predict from these administrative fields. The best ROC-AUC is 0.66, where 0.5 means random guessing. Because the HbA1c task supports a much stronger and more useful model, the final product focuses on HbA1c, and the readmission model is not used in the app.

---

## 16. Result 12: system verification

| Check | Result |
|---|---|
| Automated unit tests (`pytest`): SHAP adds up exactly, estimates never drop when a risk input rises, validation rejects impossible values, calibration uses only earlier lab results, etc. | **17 / 17 passed** |
| End-to-end API checks against the live server and MongoDB | **23 / 23 passed** |
| Access control: another patient's twin returns 403; a forged login token returns 401 | Passed |
| Frontend production build and TypeScript check | Passed |
| Real-browser test of all 6 tabs in light mode, dark mode and phone width | No errors |

---

## 17. Key takeaways (one slide)

1. **Final model:**
   - XGBoost with monotonic constraints, trained on **2,887 NHANES 2017–2018 participants**.
   - Split **80/20 (2,309 train / 578 test)**, then retrained on all data.
2. **Accuracy:** typical error **±0.35 HbA1c points**, R² **0.77** on the test set (**0.72 ± 0.06** in 5-fold cross-validation). No overfitting (train 0.773 vs test 0.769).
3. **Clinical value:**
   - **84% sensitivity / 98% specificity** for diabetes-range HbA1c.
   - **76%** of people placed in the same category as their lab test.
   - Prediabetes remains hard (43%).
4. **Explainability:** fasting glucose (65%) and age (20%) drive the estimates, which matches medical knowledge. SHAP explanations are exact.
5. **Design matters more than the algorithm:**
   - Training on measured glucose and adding monotonic constraints improved R² from 0.725 to 0.769.
   - Linear regression and XGBoost perform the same.

---

## 18. Limitations of these results

- **One survey cycle, US only.** All results come from NHANES 2017–2018; performance on other populations is untested.
- **Survey weights not used.** NHANES sampling weights were not applied, so the results describe the sample, not the whole US population.
- **Cross-sectional data.** The model estimates *current* HbA1c. It has not been validated for forecasting future values.
- **Few high-HbA1c people.** Only 13% of people are in the diabetes range, which is why those estimates are pulled toward the average.
- **Fasting glucose is required.** Without it, accuracy falls sharply (R² about 0.12).
- **Not a diagnosis.** The results support education and decision support. They do not replace a laboratory HbA1c test.

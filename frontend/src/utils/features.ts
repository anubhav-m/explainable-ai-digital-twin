// The model's 7 inputs (NHANES codes). Mirrors backend/digital_twin/features.py.
export const FEATURE_LABELS: Record<string, string> = {
  RIDAGEYR: 'Age',
  RIAGENDR: 'Gender',
  BMXBMI: 'BMI',
  BMXWAIST: 'Waist circumference',
  LBXGLU: 'Fasting glucose',
  PAQ605: 'Vigorous work activity',
  SMQ020: 'Smoked 100+ cigarettes',
};

const FEATURE_UNITS: Record<string, string> = {
  RIDAGEYR: 'years',
  BMXBMI: 'kg/m²',
  BMXWAIST: 'cm',
  LBXGLU: 'mg/dL',
};

export const CHOICES: Record<string, Record<number, string>> = {
  RIAGENDR: { 1: 'Male', 2: 'Female' },
  PAQ605: { 1: 'Yes', 2: 'No' },
  SMQ020: { 1: 'Yes', 2: 'No' },
};

// Accepted ranges; the backend rejects anything outside them
export const LIMITS = {
  RIDAGEYR: { min: 12, max: 80 },
  BMXBMI: { min: 12, max: 90 },
  BMXWAIST: { min: 50, max: 180 },
  LBXGLU: { min: 40, max: 500 },
  HBA1C: { min: 3, max: 20 },
};

// Predictions made before v1.1.0 stored one-hot columns such as "PAQ605_2.0"
const featureCode = (key: string) => (key in FEATURE_LABELS ? key : key.split('_')[0]);

export const featureLabel = (key: string) => FEATURE_LABELS[featureCode(key)] ?? key;

export const formatValue = (code: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '--';
  const choices = CHOICES[code];
  if (choices) return choices[Number(value)] ?? '--';
  const unit = FEATURE_UNITS[code];
  return unit ? `${value} ${unit}` : String(value);
};

// Sums one-hot SHAP columns back into their original input (exact, because SHAP values add up)
export const groupShap = (shap: Record<string, number> = {}): Record<string, number> => {
  const grouped: Record<string, number> = {};
  for (const [key, value] of Object.entries(shap)) {
    const code = featureCode(key);
    grouped[code] = (grouped[code] ?? 0) + value;
  }
  return grouped;
};

export type HbA1cStatus = 'normal' | 'prediabetes' | 'diabetes';

// ADA diagnostic cut-offs
export const classifyHbA1c = (value: number): HbA1cStatus =>
  value < 5.7 ? 'normal' : value < 6.5 ? 'prediabetes' : 'diabetes';

// Reserved status colors; always shown with an icon + label, never color alone
export const STATUS_INFO: Record<HbA1cStatus, { label: string; range: string; color: string }> = {
  normal: { label: 'Normal range', range: 'below 5.7%', color: 'var(--st-normal)' },
  prediabetes: { label: 'Prediabetes range', range: '5.7–6.4%', color: 'var(--st-prediabetes)' },
  diabetes: { label: 'Diabetes range', range: '6.5% or higher', color: 'var(--st-diabetes)' },
};

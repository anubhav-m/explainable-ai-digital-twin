import { FEATURE_LABELS } from './features';

const FIELD_LABELS: Record<string, string> = { ...FEATURE_LABELS, measured_hba1c: 'Lab HbA1c', age: 'Age', gender: 'Gender' };

// FastAPI returns either a message string or a list of per-field validation errors
export const apiErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d: any) => {
        const field = d.loc?.[d.loc.length - 1];
        return FIELD_LABELS[field] ? `${FIELD_LABELS[field]}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  return fallback;
};

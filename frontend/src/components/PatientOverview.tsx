import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../App';
import type { TabId } from '../App';
import { apiErrorMessage } from '../utils/api';
import { useApi } from '../utils/useApi';
import { CHOICES, FEATURE_LABELS, LIMITS, classifyHbA1c, formatValue } from '../utils/features';
import { HbA1cScale, StatusBadge } from './HbA1cScale';
import { ShapLegend, ShapRows, shapRows } from './ShapRows';
import { ErrorNote, Plate, Seal, Sk, signed, useCountUp } from './ui';

type VisitForm = Record<'RIDAGEYR' | 'RIAGENDR' | 'BMXBMI' | 'BMXWAIST' | 'LBXGLU' | 'PAQ605' | 'SMQ020', string>;

const EMPTY_FORM: VisitForm = { RIDAGEYR: '', RIAGENDR: '', BMXBMI: '', BMXWAIST: '', LBXGLU: '', PAQ605: '', SMQ020: '' };

// Pre-fill only values the model understands (an old "Low activity" = 3 must be answered again)
const toField = (code: string, value: any) => {
  if (value === null || value === undefined) return '';
  if (CHOICES[code] && !(Number(value) in CHOICES[code])) return '';
  return String(value);
};

// Units keep their own casing inside the uppercase label
const Field = ({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="label mb-2 block text-mute">{label}{unit && <span className="unit"> ({unit})</span>}</span>
    {children}
  </label>
);

const YesNo = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
  <select value={value} onChange={onChange} className="field" required>
    <option value="" disabled>Select</option>
    <option value="1">Yes</option>
    <option value="2">No</option>
  </select>
);

// Where the estimate sits relative to the two clinical lines, in one sentence
const positionSentence = (value: number) => {
  const status = classifyHbA1c(value);
  if (status === 'normal') return `In the normal range, ${(5.7 - value).toFixed(2)} below the prediabetes line.`;
  if (status === 'prediabetes') return `${(value - 5.7).toFixed(2)} past the prediabetes line and ${(6.5 - value).toFixed(2)} below the diabetes line.`;
  return `${(value - 6.5).toFixed(2)} past the diabetes line.`;
};

const Estimate = ({ value }: { value: number }) => {
  const shown = useCountUp(value);
  return (
    <p className="my-5 text-[5.75rem] leading-none tracking-[-0.02em]" aria-label={`${value.toFixed(2)} percent`}>
      {shown.toFixed(2)}<sup className="relative -top-9 ml-1 text-[2.1rem] tracking-normal">%</sup>
    </p>
  );
};

const OverviewSkeleton = () => (
  <div aria-busy="true" aria-label="Loading your twin">
    <div className="grid gap-10 lg:grid-cols-12">
      <Plate className="lg:col-span-5">
        <Sk className="h-[15px] w-52" />
        <Sk className="!absolute -top-7 right-3 !hidden h-[112px] w-[112px] rounded-full sm:!block" />
        <Sk className="my-5 h-[92px] w-64" />
        <Sk className="h-8 w-60" />
        <Sk className="mt-6 h-4 w-full max-w-[380px]" />
        <Sk className="mt-2 h-4 w-full max-w-[400px]" />
        <Sk className="mt-2 h-4 w-full max-w-[360px]" />
        <Sk className="mt-2 h-4 w-28" />
        <Sk className="mt-[66px] h-px w-full" />
        <Sk className="mt-4 h-[3px] w-full" />
        <Sk className="mt-9 h-4 w-80 max-w-full" />
        <Sk className="mt-6 h-4 w-44" />
      </Plate>
      <Plate className="lg:col-span-7" i={1}>
        <Sk className="h-7 w-96 max-w-full" />
        <Sk className="mb-5 mt-3 h-[15px] w-72" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-hair py-[17px]">
            <Sk className="h-4 w-36" /><Sk className="h-4 w-20" /><Sk className="h-3 flex-1" /><Sk className="h-4 w-10" />
          </div>
        ))}
        <Sk className="mt-5 h-4 w-72" />
      </Plate>
    </div>
    <div className="mt-8 grid grid-cols-2 gap-y-6 border-t border-hair lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={`pt-5 ${i > 0 ? 'lg:border-l lg:border-hair lg:px-6' : ''}`}><Sk className="h-[15px] w-28" /><Sk className="mt-3 h-9 w-24" /><Sk className="mt-2 h-4 w-20" /></div>
      ))}
    </div>
  </div>
);

type Props = { patientId: string; visitOpen: boolean; setVisitOpen: (open: boolean) => void; goTo: (tab: TabId) => void };

export const PatientOverview = ({ patientId, visitOpen, setVisitOpen, goTo }: Props) => {
  const twin = useApi(`/patients/${patientId}/twin`);
  const prediction = useApi(`/patients/${patientId}/prediction`);
  const [form, setForm] = useState<VisitForm>(EMPTY_FORM);
  const [labHba1c, setLabHba1c] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('');

  const data = twin.data;
  const isNewTwin = !!data && (!data.current_state || Object.keys(data.current_state).length === 0);

  useEffect(() => {
    if (!data) return;
    const state = { ...data.demographics, ...data.clinical_state, ...data.lifestyle_state };
    setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map(code => [code, toField(code, state[code])])) as VisitForm);
    setNewAge(toField('RIDAGEYR', state.RIDAGEYR));
    setNewGender(toField('RIAGENDR', state.RIAGENDR));
    // A brand-new twin has nothing to estimate from yet, so open the first-visit form
    if (!data.current_state || Object.keys(data.current_state).length === 0) setVisitOpen(true);
  }, [data, setVisitOpen]);

  const setField = (code: keyof VisitForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [code]: e.target.value });

  const refresh = () => {
    twin.reload();
    prediction.reload();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/patients/${patientId}/update`, {
        data: Object.fromEntries(Object.entries(form).map(([code, value]) => [code, Number(value)])),
        measured_hba1c: labHba1c === '' ? null : Number(labHba1c)
      });
      setVisitOpen(false);
      setLabHba1c('');
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this visit. Check your values and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/patients/${patientId}/demographics`, {
        age: Number(newAge),
        gender: Number(newGender)
      });
      setShowDemoForm(false);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save your age and gender.'));
    } finally {
      setLoading(false);
    }
  };

  if (!data || !prediction.data) {
    const failed = twin.error || prediction.error;
    return failed ? <ErrorNote message={failed} onRetry={refresh} /> : <OverviewSkeleton />;
  }

  const current = prediction.data.current_prediction;
  const history: any[] = prediction.data.history || [];
  const model = prediction.data.model_info || {};
  const state = { ...data.demographics, ...data.clinical_state, ...data.lifestyle_state };
  const lastVisit = data.predictions?.length ? new Date(data.predictions[data.predictions.length - 1].timestamp).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;

  const rows = current ? shapRows(current) : [];
  const totalPush = rows.reduce((sum, r) => sum + r.value, 0);
  const baseValue: number = current ? current.shap_base_value ?? current.predicted_value - totalPush : 0;
  const lastLab = [...history].reverse().find(h => h.measured != null);
  const previous = history.length >= 2 ? history[history.length - 2] : null;

  return (
    <div>
      <h1 className="sr-only">Today</h1>

      <div className="expand" data-open={visitOpen} inert={!visitOpen}>
        <div>
          <Plate className="mb-8 border-b border-hair" label="Log a visit">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-2xl leading-tight tracking-[-0.01em]">{isNewTwin ? 'Log your first visit' : 'Log a visit'}</h2>
                <p className="mt-2 max-w-[60ch] text-mute">
                  {isNewTwin
                    ? 'Your twin is empty. Enter all 7 values the model uses so it can estimate your HbA1c.'
                    : 'These are the 7 values the model uses. Update whatever changed since your last visit.'}
                </p>
              </div>
              {!isNewTwin && (
                <button type="button" onClick={() => setVisitOpen(false)} aria-label="Close the visit form" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hair transition-colors duration-100 hover:border-ink">
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
            <form onSubmit={handleUpdate} className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
              <Field label="Age (years)">
                <input type="number" step="1" min={LIMITS.RIDAGEYR.min} max={LIMITS.RIDAGEYR.max} value={form.RIDAGEYR} onChange={setField('RIDAGEYR')} className="field" required/>
              </Field>
              <Field label="Gender">
                <select value={form.RIAGENDR} onChange={setField('RIAGENDR')} className="field" required>
                  <option value="" disabled>Select</option>
                  <option value="1">Male</option>
                  <option value="2">Female</option>
                </select>
              </Field>
              <Field label="BMI" unit="kg/m²">
                <input type="number" step="0.1" min={LIMITS.BMXBMI.min} max={LIMITS.BMXBMI.max} value={form.BMXBMI} onChange={setField('BMXBMI')} className="field" required/>
              </Field>
              <Field label="Fasting glucose" unit="mg/dL">
                <input type="number" step="0.1" min={LIMITS.LBXGLU.min} max={LIMITS.LBXGLU.max} value={form.LBXGLU} onChange={setField('LBXGLU')} className="field" required/>
              </Field>
              <Field label="Waist" unit="cm">
                <input type="number" step="0.1" min={LIMITS.BMXWAIST.min} max={LIMITS.BMXWAIST.max} value={form.BMXWAIST} onChange={setField('BMXWAIST')} className="field" required/>
              </Field>
              <Field label="Vigorous activity at work?">
                <YesNo value={form.PAQ605} onChange={setField('PAQ605')} />
              </Field>
              <Field label="Smoked 100+ cigarettes in life?">
                <YesNo value={form.SMQ020} onChange={setField('SMQ020')} />
              </Field>
              <Field label="Lab result, optional" unit="HbA1c %">
                <input type="number" step="0.1" min={LIMITS.HBA1C.min} max={LIMITS.HBA1C.max} value={labHba1c} onChange={e => setLabHba1c(e.target.value)} className="field" placeholder="Only if you have a result"/>
              </Field>
              <div className="col-span-2 flex flex-wrap items-center gap-5 lg:col-span-4">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? 'Updating your twin' : 'Save visit and update estimate'}
                </button>
                <p className="text-sm text-mute">A lab result, when you have one, tunes later estimates to you.</p>
              </div>
            </form>
          </Plate>
        </div>
      </div>

      {error && <div className="mb-8"><ErrorNote message={error} /></div>}

      {current ? (
        <>
          <div className="grid gap-10 lg:grid-cols-12">
            <Plate landed className="lg:col-span-5" label="Estimated HbA1c">
              <h2 className="label text-mute">Estimated HbA1c{lastVisit && ` · ${lastVisit}`}</h2>
              <Seal ring="MODEL ESTIMATE · NOT A DIAGNOSIS · " className="!absolute -top-7 right-3 hidden sm:block">
                {model.mae != null ? `±${model.mae.toFixed(2)}` : 'Est.'}
              </Seal>
              <Estimate value={current.predicted_value} />
              <StatusBadge value={current.predicted_value} withRange />
              <p className="mt-6 max-w-[44ch]">
                {positionSentence(current.predicted_value)}
                {current.calibrated_value != null && ` Tuned to your ${current.calibration_points} lab result${current.calibration_points > 1 ? 's' : ''}, the twin reads ${current.calibrated_value.toFixed(2)}%.`}
                {' '}This is a model estimate{model.mae != null && `, typically within ±${model.mae.toFixed(2)} points`}, not a lab result or a diagnosis.
              </p>
              <div className="mt-8">
                <HbA1cScale markers={[{ label: 'You', value: current.predicted_value }]} />
              </div>
              <button onClick={() => goTo('predictions')} className="link label mt-6 inline-flex items-center gap-2">
                Full estimate and trend <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </Plate>

            <Plate landed className="lg:col-span-7" i={1} label="Why this number">
              <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">Seven inputs, and how far each moved you</h2>
              <p className="label mb-5 mt-3 text-mute">
                Average start {baseValue.toFixed(2)} {signed(totalPush)} from your inputs = {current.predicted_value.toFixed(2)}
              </p>
              <ShapRows rows={rows} />
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <ShapLegend />
                <button onClick={() => goTo('explainability')} className="link label inline-flex items-center gap-2">
                  Full breakdown <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </Plate>
          </div>

          <section aria-label="At a glance" className="view mt-8 grid grid-cols-2 gap-y-6 border-t border-hair lg:grid-cols-4">
            {[
              { label: 'Last lab result', value: lastLab ? `${lastLab.measured.toFixed(2)}%` : 'None yet', note: lastLab ? lastLab.name : 'Add one when you log a visit' },
              { label: 'Tuned to your labs', value: current.calibrated_value != null ? `${current.calibrated_value.toFixed(2)}%` : 'Not yet', note: current.calibrated_value != null ? `from ${current.calibration_points} result${current.calibration_points > 1 ? 's' : ''}` : 'Needs one earlier lab result' },
              { label: 'Since last visit', value: previous ? signed(current.predicted_value - previous.hba1c) : 'First visit', note: previous ? `was ${previous.hba1c.toFixed(2)}%` : 'Nothing to compare yet' },
              current.predicted_value < 6.5
                ? { label: 'To the diabetes line', value: (6.5 - current.predicted_value).toFixed(2), note: 'points below 6.5' }
                : { label: 'Past the diabetes line', value: (current.predicted_value - 6.5).toFixed(2), note: 'points above 6.5' },
            ].map((item, i) => (
              <div key={item.label} className={`pt-5 lg:border-l lg:border-hair lg:px-6 ${i === 0 ? 'lg:border-l-0 lg:pl-0' : ''} ${i % 2 === 1 ? 'border-l border-hair pl-5' : 'pr-5'}`}>
                <h3 className="label text-mute">{item.label}</h3>
                <p className="mt-2 text-[2.1rem] leading-tight tracking-[-0.01em]">{item.value}</p>
                <p className="text-[15px] text-mute">{item.note}</p>
              </div>
            ))}
          </section>

          <Plate className="mt-8" i={2} label="What you logged">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">What your twin knows about you</h2>
              <button onClick={() => setShowDemoForm(!showDemoForm)} className="link label">
                {showDemoForm ? 'Cancel' : 'Edit age and gender'}
              </button>
            </div>

            <div className="expand" data-open={showDemoForm} inert={!showDemoForm}>
              <div>
                <form onSubmit={handleDemoUpdate} className="flex flex-wrap items-end gap-5 pb-2 pt-5">
                  <div className="w-40">
                    <Field label="Age (years)">
                      <input type="number" step="1" min={LIMITS.RIDAGEYR.min} max={LIMITS.RIDAGEYR.max} value={newAge} onChange={e=>setNewAge(e.target.value)} className="field" required/>
                    </Field>
                  </div>
                  <div className="w-40">
                    <Field label="Gender">
                      <select value={newGender} onChange={e=>setNewGender(e.target.value)} className="field" required>
                        <option value="" disabled>Select</option>
                        <option value="1">Male</option>
                        <option value="2">Female</option>
                      </select>
                    </Field>
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-outline">
                    {loading ? 'Saving' : 'Save'}
                  </button>
                </form>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 border-t border-hair sm:grid-cols-4 lg:grid-cols-7">
              {Object.keys(FEATURE_LABELS).map((code) => (
                <div key={code} className="border-b border-hair py-4 pr-4">
                  <dt className="label text-mute">{FEATURE_LABELS[code]}</dt>
                  <dd className="mt-1.5 text-lg">{formatValue(code, state[code])}</dd>
                </div>
              ))}
            </dl>
          </Plate>
        </>
      ) : !visitOpen && (
        <Plate className="dots flex min-h-[320px] flex-col items-start justify-end">
          <div className="max-w-[46ch] bg-sheet p-5">
            <h2 className="text-2xl leading-tight tracking-[-0.01em]">Your twin is empty</h2>
            <p className="mt-2 text-mute">Log your first visit and it will estimate your HbA1c and show what moved it.</p>
            <button onClick={() => setVisitOpen(true)} className="btn mt-5">Log your first visit</button>
          </div>
        </Plate>
      )}
    </div>
  );
};

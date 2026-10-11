import { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../App';
import { apiErrorMessage } from '../utils/api';
import { useApi } from '../utils/useApi';
import { FEATURE_LABELS } from '../utils/features';
import { HbA1cScale, StatusBadge } from './HbA1cScale';
import { EmptyNote, ErrorNote, PageHead, Plate, Sk, signed, useCountUp } from './ui';

type Scenario = { BMXBMI: number; BMXWAIST: number; LBXGLU: number; PAQ605: number };

const SLIDERS = [
  { code: 'BMXBMI', unit: 'kg/m²', min: 15, max: 55, step: 0.5 },
  { code: 'BMXWAIST', unit: 'cm', min: 60, max: 160, step: 1 },
  { code: 'LBXGLU', unit: 'mg/dL', min: 70, max: 300, step: 1 },
] as const;

const Counted = ({ value, className }: { value: number; className: string }) => {
  const shown = useCountUp(value, 800);
  return <p className={className}>{shown.toFixed(2)}%</p>;
};

const ControlsSkeleton = () => (
  <div className="grid gap-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading your current values">
    <Plate className="lg:col-span-5">
      <Sk className="h-7 w-56" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="mt-8"><div className="flex justify-between"><Sk className="h-4 w-32" /><Sk className="h-4 w-28" /></div><Sk className="mt-5 h-px w-full" /></div>
      ))}
      <Sk className="mt-10 h-11 w-full" />
    </Plate>
    <Plate className="lg:col-span-7" i={1}><Sk className="h-7 w-48" /><Sk className="mt-6 h-64 w-full" /></Plate>
  </div>
);

const OutcomeSkeleton = () => (
  <div aria-busy="true" aria-label="Running the model">
    <div className="flex items-end justify-between gap-6">
      <div><Sk className="h-3 w-28" /><Sk className="mt-3 h-14 w-40" /></div>
      <Sk className="h-6 w-16" />
      <div><Sk className="h-3 w-28" /><Sk className="mt-3 h-14 w-40" /></div>
    </div>
    <Sk className="mt-12 h-px w-full" />
    <Sk className="mt-9 h-1 w-full" />
    <Sk className="mt-10 h-4 w-full" /><Sk className="mt-2 h-4 w-3/4" />
  </div>
);

export const WhatIfSimulator = ({ patientId, onLogVisit }: { patientId: string; onLogVisit: () => void }) => {
  const twin = useApi(`/patients/${patientId}/twin`);
  const [current, setCurrent] = useState<Scenario | null>(null);
  const [target, setTarget] = useState<Scenario | null>(null);

  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [error, setError] = useState('');

  const state = twin.data?.current_state || {};
  const hasVisit = Object.keys(state).length > 0;

  useEffect(() => {
    if (!twin.data || !hasVisit) return;
    // Sliders start at the patient's own values from their last visit; a late response never overwrites edits
    const values = { BMXBMI: state.BMXBMI, BMXWAIST: state.BMXWAIST, LBXGLU: state.LBXGLU, PAQ605: state.PAQ605 === 1 ? 1 : 2 };
    setCurrent(values);
    setTarget(prev => prev ?? values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twin.data]);

  // Only send the inputs that were actually changed
  const changed = current && target
    ? Object.fromEntries(Object.entries(target).filter(([code, value]) => value !== current[code as keyof Scenario]))
    : {};
  const nothingChanged = Object.keys(changed).length === 0;

  const runSimulation = () => {
    setLoading(true);
    setError('');
    axios.post(`${API_BASE}/patients/${patientId}/simulate`, {
      scenario_name: "Custom Intervention",
      modified_variables: changed
    })
    .then(res => {
      setScenario(res.data);
      setLoading(false);
    })
    .catch(err => {
      setError(apiErrorMessage(err, 'The simulation did not run. Try again.'));
      setLoading(false);
    });
  };

  const head = (
    <PageHead title="Try a change" term="What-If Simulator">
      Change your inputs and see how the model's HbA1c estimate responds.
    </PageHead>
  );

  if (!twin.data) return <>{head}{twin.error ? <ErrorNote message={twin.error} onRetry={twin.reload} /> : <ControlsSkeleton />}</>;
  if (!hasVisit) {
    return (
      <>
        {head}
        <EmptyNote title="Nothing to change yet" action={<button onClick={onLogVisit} className="btn">Log your first visit</button>}>
          The simulator starts from your own values, so it needs one logged visit.
        </EmptyNote>
      </>
    );
  }
  if (!current || !target) return <>{head}<ControlsSkeleton /></>;

  return (
    <>
      {head}
      <div className="grid gap-10 lg:grid-cols-12">

        {/* Controls */}
        <Plate landed className="lg:col-span-5" label="What to change">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">What would you change?</h2>
            <button onClick={() => setTarget(current)} disabled={nothingChanged} className="link label inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40">
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} /> Reset
            </button>
          </div>

          <div className="mt-7 space-y-7">
            {SLIDERS.map(({ code, unit, min, max, step }) => {
              const moved = target[code] !== current[code];
              return (
                <div key={code}>
                  <label htmlFor={`range-${code}`} className="flex items-baseline justify-between gap-4">
                    <span>{FEATURE_LABELS[code]}</span>
                    <span className="text-mute">
                      {moved && <>{current[code]} <ArrowRight className="mx-1 inline h-3.5 w-3.5" strokeWidth={1.5} aria-label="to" /> </>}
                      <span className={moved ? 'bg-seal px-1.5 font-medium text-ink' : 'text-ink'}>{target[code]}</span> {unit}
                    </span>
                  </label>
                  <input
                    id={`range-${code}`}
                    type="range"
                    min={Math.min(min, current[code])} max={Math.max(max, current[code])} step={step}
                    value={target[code]}
                    onChange={(e) => setTarget({ ...target, [code]: parseFloat(e.target.value) })}
                    className="range mt-2"
                  />
                </div>
              );
            })}

            <fieldset>
              <legend className="mb-3">Does your work involve vigorous physical activity?</legend>
              <div className="grid grid-cols-2">
                {[{ value: 1, label: 'Yes' }, { value: 2, label: 'No' }].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={target.PAQ605 === option.value}
                    onClick={() => setTarget({ ...target, PAQ605: option.value })}
                    className={`label min-h-[44px] border border-ink transition-colors duration-100 first:border-r-0 ${target.PAQ605 === option.value ? 'bg-ink text-sheet' : 'hover:bg-seal'}`}
                  >
                    {option.label}{current.PAQ605 === option.value ? ' (now)' : ''}
                  </button>
                ))}
              </div>
            </fieldset>

            <button onClick={runSimulation} disabled={loading || nothingChanged} className="btn w-full">
              {loading ? 'Running the model' : nothingChanged ? 'Change a value to simulate' : 'Run the simulation'}
            </button>
            {error && <ErrorNote message={error} />}
          </div>
        </Plate>

        {/* Results */}
        <Plate landed className="lg:col-span-7" i={1} label="Simulation outcome">
          <h2 className="mb-7 text-[1.4rem] leading-tight tracking-[-0.01em]">What the model expects</h2>

          {loading ? (
            <OutcomeSkeleton />
          ) : scenario ? (
            <div key={scenario.scenario_prediction} className="view">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h3 className="label text-mute">Current estimate</h3>
                  <p className="mt-2 text-[3.5rem] leading-none tracking-[-0.02em] text-mute">{scenario.baseline_prediction.toFixed(2)}%</p>
                  <div className="mt-3"><StatusBadge value={scenario.baseline_prediction} /></div>
                </div>
                <p className="flex items-center gap-3 bg-seal px-3 py-1.5 text-xl">
                  {signed(scenario.prediction_difference)} <ArrowRight className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </p>
                <div>
                  <h3 className="label text-mute">Scenario estimate</h3>
                  <Counted value={scenario.scenario_prediction} className="mt-2 text-[3.5rem] leading-none tracking-[-0.02em]" />
                  <div className="mt-3"><StatusBadge value={scenario.scenario_prediction} /></div>
                </div>
              </div>

              <div className="mt-10">
                <HbA1cScale markers={[
                  { label: 'Now', value: scenario.baseline_prediction, hollow: true },
                  { label: 'Scenario', value: scenario.scenario_prediction },
                ]} />
              </div>

              <p className="mt-6 max-w-[68ch] border-t border-hair pt-5">
                {scenario.message} Inputs you did not change keep their values from your last visit. This is a model estimate, not a promise of what your body will do.
              </p>
            </div>
          ) : (
            <div className="dots flex min-h-[300px] items-end">
              <p className="max-w-[40ch] bg-sheet p-5 text-mute">Move a slider or switch the activity answer, then run the simulation. The result appears here.</p>
            </div>
          )}
        </Plate>

      </div>
    </>
  );
};

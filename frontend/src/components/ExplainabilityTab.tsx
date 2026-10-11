import { useApi } from '../utils/useApi';
import { ShapLegend, ShapRows, shapRows } from './ShapRows';
import { EmptyNote, ErrorNote, PageHead, Plate, Sk, signed } from './ui';

const ExplainSkeleton = () => (
  <div className="grid gap-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading the breakdown">
    <Plate className="lg:col-span-8">
      <Sk className="h-7 w-80 max-w-full" />
      <Sk className="mb-6 mt-3 h-3 w-72" />
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-hair py-[15px]">
          <Sk className="h-4 w-36" /><Sk className="h-4 w-20" /><Sk className="h-3 flex-1" /><Sk className="h-4 w-10" />
        </div>
      ))}
    </Plate>
    <Plate className="lg:col-span-4" i={1}>
      <Sk className="h-3 w-40" /><Sk className="mt-3 h-10 w-28" /><Sk className="mt-3 h-4 w-full" />
      <Sk className="mt-10 h-3 w-40" /><Sk className="mt-3 h-10 w-28" /><Sk className="mt-3 h-4 w-full" />
    </Plate>
  </div>
);

export const ExplainabilityTab = ({ patientId, onLogVisit }: { patientId: string; onLogVisit: () => void }) => {
  const { data, error, reload } = useApi(`/patients/${patientId}/prediction`);

  const head = (
    <PageHead title="Why this number" term="Explainability · SHAP TreeExplainer">
      How each of your inputs moved the current HbA1c estimate.
    </PageHead>
  );

  if (!data) return <>{head}{error ? <ErrorNote message={error} onRetry={reload} /> : <ExplainSkeleton />}</>;
  if (!data.current_prediction) {
    return (
      <>
        {head}
        <EmptyNote title="Nothing to explain yet" action={<button onClick={onLogVisit} className="btn">Log your first visit</button>}>
          Once you log a visit, this page shows which inputs pushed your estimate up or down.
        </EmptyNote>
      </>
    );
  }

  const currentPred = data.current_prediction;
  const rows = shapRows(currentPred);
  const totalPush = rows.reduce((sum, d) => sum + d.value, 0);
  const baseValue: number = currentPred.shap_base_value ?? currentPred.predicted_value - totalPush;
  const topDriver = rows.find(d => d.value > 0);
  const topProtector = rows.find(d => d.value < 0);

  return (
    <>
      {head}
      <div className="grid gap-10 lg:grid-cols-12">
        <Plate landed className="lg:col-span-8" label="Input contributions">
          <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">Your inputs, largest push first</h2>

          {/* The arithmetic closes on screen: start + pushes = estimate */}
          <div className="my-6 flex flex-wrap items-end gap-x-5 gap-y-3 border-y border-hair py-4">
            <p><span className="block text-[2.1rem] leading-tight tracking-[-0.01em]">{baseValue.toFixed(2)}%</span><span className="label text-mute">The model's average start</span></p>
            <span className="pb-6 text-2xl text-mute" aria-hidden>{totalPush >= 0 ? '+' : '−'}</span>
            <p><span className="block text-[2.1rem] leading-tight tracking-[-0.01em]">{Math.abs(totalPush).toFixed(2)}</span><span className="label text-mute">Your inputs combined</span></p>
            <span className="pb-6 text-2xl text-mute" aria-hidden>=</span>
            <p><span className="block text-[2.1rem] leading-tight tracking-[-0.01em]">{currentPred.predicted_value.toFixed(2)}%</span><span className="label text-mute">Your estimate</span></p>
          </div>

          <ShapRows rows={rows} />
          <div className="mt-5"><ShapLegend /></div>
          <p className="mt-6 max-w-[70ch] text-[15px] text-mute">
            Numbers are HbA1c points. SHAP shows how the model used your inputs. It does not prove that an input causes a change in your HbA1c.
          </p>
        </Plate>

        <Plate landed className="lg:col-span-4" i={1} label="Largest effects">
          <div>
            <h3 className="label text-mute">Pushed the estimate up most</h3>
            {topDriver ? (
              <>
                <p className="mt-2 text-[2.1rem] leading-tight tracking-[-0.01em]">{signed(topDriver.value)}</p>
                <p>{topDriver.feature} ({topDriver.display}) added {topDriver.value.toFixed(2)} points.</p>
              </>
            ) : <p className="mt-2">No input pushed the estimate up.</p>}
          </div>
          <div className="mt-8 border-t border-hair pt-6">
            <h3 className="label text-mute">Pulled the estimate down most</h3>
            {topProtector ? (
              <>
                <p className="mt-2 text-[2.1rem] leading-tight tracking-[-0.01em]">{signed(topProtector.value)}</p>
                <p>{topProtector.feature} ({topProtector.display}) removed {Math.abs(topProtector.value).toFixed(2)} points.</p>
              </>
            ) : <p className="mt-2">No input pulled the estimate down.</p>}
          </div>
        </Plate>
      </div>
    </>
  );
};

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { useApi } from '../utils/useApi';
import { chartColors, chartFont } from '../utils/chartTheme';
import { STATUS_INFO, classifyHbA1c } from '../utils/features';
import { HbA1cScale, StatusBadge } from './HbA1cScale';
import { TooltipCard } from './ChartTooltip';
import { EmptyNote, ErrorNote, PageHead, Plate, Seal, Sk, useCountUp } from './ui';

const Estimate = ({ value }: { value: number }) => {
  const shown = useCountUp(value);
  return (
    <p className="my-5 text-[5.75rem] leading-none tracking-[-0.02em]" aria-label={`${value.toFixed(2)} percent`}>
      {shown.toFixed(2)}<sup className="relative -top-9 ml-1 text-[2.1rem] tracking-normal">%</sup>
    </p>
  );
};

const PredictionsSkeleton = () => (
  <div className="grid gap-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading your estimate">
    <Plate className="lg:col-span-5">
      <Sk className="h-3 w-52" />
      <Sk className="!absolute -top-7 right-3 !hidden h-[112px] w-[112px] rounded-full sm:!block" />
      <Sk className="my-5 h-[92px] w-64" />
      <Sk className="h-8 w-60" />
      <Sk className="mt-9 h-px w-full" />
      <Sk className="mt-9 h-1 w-full" />
      <Sk className="mt-8 h-4 w-full" /><Sk className="mt-2 h-4 w-5/6" /><Sk className="mt-2 h-4 w-2/3" />
    </Plate>
    <Plate className="lg:col-span-7" i={1}>
      <Sk className="h-7 w-64" />
      <Sk className="mt-3 h-4 w-96 max-w-full" />
      <Sk className="mt-6 h-72 w-full" />
    </Plate>
  </div>
);

export const PredictionsTab = ({ patientId, onLogVisit }: { patientId: string; onLogVisit: () => void }) => {
  const { data, error, reload } = useApi(`/patients/${patientId}/prediction`);

  const head = (
    <PageHead title="Your estimate" term="Prediction · XGBoost">
      Estimated HbA1c from the latest state of your digital twin.
    </PageHead>
  );

  if (!data) return <>{head}{error ? <ErrorNote message={error} onRetry={reload} /> : <PredictionsSkeleton />}</>;
  if (!data.current_prediction) {
    return (
      <>
        {head}
        <EmptyNote title="No estimate yet" action={<button onClick={onLogVisit} className="btn">Log your first visit</button>}>
          The model needs one logged visit before it can estimate your HbA1c.
        </EmptyNote>
      </>
    );
  }

  const currentPred = data.current_prediction;
  const historyData: any[] = data.history;
  const model = data.model_info || {};
  const value: number = currentPred.predicted_value;
  const status = STATUS_INFO[classifyHbA1c(value)];
  const hasLabResults = historyData.some(h => h.measured != null);

  const markers = [{ label: 'Estimate', value, hollow: currentPred.calibrated_value != null }];
  if (currentPred.calibrated_value != null) markers.push({ label: 'Tuned', value: currentPred.calibrated_value, hollow: false });

  return (
    <>
      {head}
      <div className="grid gap-10 lg:grid-cols-12">

        {/* Current Prediction */}
        <Plate landed className="lg:col-span-5" label="Current estimate">
          <h2 className="label text-mute">Estimated HbA1c · current</h2>
          <Seal ring="MODEL ESTIMATE · NOT A DIAGNOSIS · " className="!absolute -top-7 right-3 hidden sm:block">
            {model.mae != null ? `±${model.mae.toFixed(2)}` : 'Est.'}
          </Seal>
          <Estimate value={value} />
          <StatusBadge value={value} withRange />

          <div className="mt-9">
            <HbA1cScale markers={markers} />
          </div>

          <div className="mt-6 space-y-4 border-t border-hair pt-5">
            <p>
              The {currentPred.model_name} model estimates your HbA1c at {value.toFixed(2)}%, in the {status.label.toLowerCase()} ({status.range}).
              This is a model estimate, not a lab result or a diagnosis.
              {model.mae != null && ` On ${model.test_rows} people it never saw, its typical error was ±${model.mae.toFixed(2)} percentage points.`}
            </p>
            {currentPred.calibrated_value != null && (
              <p>
                Tuned with your own {currentPred.calibration_points} earlier lab result{currentPred.calibration_points > 1 ? 's' : ''}, your twin estimates <strong className="font-semibold">{currentPred.calibrated_value.toFixed(2)}%</strong>.
                {currentPred.measured_hba1c != null && ` Lab result logged at this visit: ${currentPred.measured_hba1c.toFixed(2)}%.`}
              </p>
            )}
          </div>
        </Plate>

        {/* Prediction Trajectory */}
        <Plate landed className="lg:col-span-7" i={1} label="HbA1c across visits">
          <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">HbA1c across your visits</h2>
          <p className="mt-2 text-mute">Each point is the model's estimate at a logged visit. This is history, not a forecast.</p>

          <div className="label mt-5 flex flex-wrap gap-x-6 gap-y-1 text-mute">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ink" />Estimate</span>
            {hasLabResults && <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-ink bg-seal" />Lab result</span>}
            <span className="flex items-center gap-2"><span className="w-5 border-t border-dashed border-mute" />5.7 prediabetes, 6.5 diabetes</span>
          </div>

          <div className="mt-3 h-72 w-full">
              <ComposedChart responsive style={{ width: '100%', height: '100%' }} data={historyData} margin={{ top: 12, right: 30, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartColors.grid} strokeOpacity={0.6} />
                <XAxis dataKey="name" axisLine={{ stroke: chartColors.grid }} tickLine={false} tick={chartFont} tickMargin={8} padding={{ left: 28, right: 28 }} />
                <YAxis
                  domain={[(dataMin: number) => Math.min(5.5, Math.floor(dataMin * 2) / 2 - 0.5), (dataMax: number) => Math.max(7, Math.ceil(dataMax * 2) / 2 + 0.5)]}
                  axisLine={false} tickLine={false} tick={chartFont}
                />
                {/* Threshold values sit in the right margin, outside the data, so they can never collide with it */}
                <ReferenceLine y={5.7} stroke={chartColors.axis} strokeDasharray="4 4" label={{ value: '5.7', position: 'right', ...chartFont }} />
                <ReferenceLine y={6.5} stroke={chartColors.axis} strokeDasharray="4 4" label={{ value: '6.5', position: 'right', ...chartFont }} />
                <Tooltip
                  cursor={{ stroke: chartColors.ink, strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const point: any = payload[0].payload;
                    const rows: { name: string; value: string; hollow?: boolean }[] = [{ name: 'Estimate', value: `${point.hba1c.toFixed(2)}%` }];
                    if (point.measured != null) rows.push({ name: 'Lab result', value: `${point.measured.toFixed(2)}%`, hollow: true });
                    if (point.calibrated != null) rows.push({ name: 'Tuned to labs', value: `${point.calibrated.toFixed(2)}%` });
                    return <TooltipCard title={String(label)} rows={rows} />;
                  }}
                />
                <Line type="linear" dataKey="hba1c" name="Estimate" stroke={chartColors.ink} strokeWidth={1.5} animationDuration={1100} animationEasing="ease-out"
                  dot={{ r: 4, fill: chartColors.ink, stroke: chartColors.surface, strokeWidth: 2 }} activeDot={{ r: 6, fill: chartColors.ink, stroke: chartColors.surface, strokeWidth: 2 }} />
                <Line dataKey="measured" name="Lab result" stroke="none" connectNulls={false} isAnimationActive={false} activeDot={false}
                  dot={{ r: 5, fill: chartColors.seal, stroke: chartColors.ink, strokeWidth: 1 }} />
              </ComposedChart>
          </div>

          <details className="group mt-4">
            <summary className="link label inline-block cursor-pointer list-none">Show values as a table</summary>
            <table className="mt-3 w-full text-left">
              <thead className="label text-mute">
                <tr><th className="py-2 font-normal">Visit</th><th className="font-normal">Estimate</th><th className="font-normal">Lab result</th><th className="font-normal">Tuned to labs</th></tr>
              </thead>
              <tbody>
                {historyData.map(h => (
                  <tr key={h.name} className="border-t border-hair">
                    <td className="py-2">{h.name}</td>
                    <td>{h.hba1c.toFixed(2)}%</td>
                    <td>{h.measured != null ? `${h.measured.toFixed(2)}%` : 'Not logged'}</td>
                    <td>{h.calibrated != null ? `${h.calibrated.toFixed(2)}%` : 'Not yet'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <p className="label mt-6 border-t border-hair pt-4 text-mute">
            Model {currentPred.model_name} {currentPred.model_version} · Features {currentPred.feature_version}
          </p>
        </Plate>

      </div>
    </>
  );
};

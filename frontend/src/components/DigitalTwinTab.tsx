import React from 'react';
import { useApi } from '../utils/useApi';
import { featureLabel, groupShap } from '../utils/features';
import { StatusBadge } from './HbA1cScale';
import { EmptyNote, ErrorNote, PageHead, Sk } from './ui';

const TwinSkeleton = () => (
  <div aria-busy="true" aria-label="Loading your history">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="grid gap-x-10 gap-y-4 border-t border-hair py-7 lg:grid-cols-12">
        <div className="lg:col-span-3"><Sk className="h-3 w-40" /><Sk className="mt-3 h-6 w-28" /></div>
        <div className="lg:col-span-3"><Sk className="h-12 w-36" /></div>
        <div className="lg:col-span-6"><Sk className="h-4 w-full" /><Sk className="mt-2 h-4 w-2/3" /></div>
      </div>
    ))}
  </div>
);

export const DigitalTwinTab = ({ patientId, onLogVisit }: { patientId: string; onLogVisit: () => void }) => {
  const { data, error, reload } = useApi(`/patients/${patientId}/twin`);

  const head = (
    <PageHead title="Your history" term="Digital Twin state">
      Every visit you logged, newest first, with what the twin estimated and how it compared to your lab results.
    </PageHead>
  );

  if (!data) return <>{head}{error ? <ErrorNote message={error} onRetry={reload} /> : <TwinSkeleton />}</>;
  if (!data.predictions || data.predictions.length === 0) {
    return (
      <>
        {head}
        <EmptyNote title="No visits yet" action={<button onClick={onLogVisit} className="btn">Log your first visit</button>}>
          Your twin grows with every visit you log. The first one starts its history.
        </EmptyNote>
      </>
    );
  }

  // Format predictions into timeline events
  const trajectoryEvents = data.predictions.map((pred: any, idx: number) => {
    const isCurrent = idx === data.predictions.length - 1;

    // Top driver = the input with the largest SHAP push
    const shapData = Object.entries(groupShap(pred.shap_local || {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    return {
      time: new Date(pred.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
      event: isCurrent ? 'Current state' : `Visit ${idx + 1}`,
      isCurrent,
      hba1c: pred.predicted_value as number,
      measured: pred.measured_hba1c as number | null,
      calibrated: pred.calibrated_value as number | null,
      calibrationPoints: pred.calibration_points as number,
      topDriver: shapData.length > 0 ? featureLabel(shapData[0][0]) : null,
      modelVersion: pred.model_version,
    };
  }).reverse();

  return (
    <>
      {head}
      <ol className="border-b border-hair">
        {trajectoryEvents.map((item: any, index: number) => (
          <li
            key={item.time + item.event}
            className="plate grid gap-x-10 gap-y-4 border-t border-hair !px-0 py-7 after:hidden lg:grid-cols-12"
            style={{ '--i': Math.min(index, 6) } as React.CSSProperties}
          >
            <div className="lg:col-span-3">
              <p className="label text-mute">{item.time}</p>
              <h2 className="mt-2 text-[1.4rem] leading-tight tracking-[-0.01em]">{item.event}</h2>
            </div>

            <div className="lg:col-span-3">
              <p className={`leading-none tracking-[-0.02em] ${item.isCurrent ? 'text-[3.5rem]' : 'text-[2.6rem] text-mute'}`}>{item.hba1c.toFixed(2)}%</p>
              <div className="mt-3"><StatusBadge value={item.hba1c} /></div>
            </div>

            <dl className="grid content-start gap-x-8 gap-y-3 sm:grid-cols-2 lg:col-span-6">
              <div>
                <dt className="label text-mute">Moved it most</dt>
                <dd className="mt-1">{item.topDriver ?? 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="label text-mute">Lab result</dt>
                <dd className="mt-1">
                  {item.measured != null
                    ? `${item.measured.toFixed(2)}%. The twin was off by ${Math.abs(item.measured - item.hba1c).toFixed(2)} points.`
                    : 'Not logged at this visit'}
                </dd>
              </div>
              <div>
                <dt className="label text-mute">Tuned to your labs</dt>
                <dd className="mt-1">
                  {item.calibrated != null
                    ? `${item.calibrated.toFixed(2)}%, using ${item.calibrationPoints} earlier lab result${item.calibrationPoints > 1 ? 's' : ''}`
                    : 'Needs an earlier lab result'}
                </dd>
              </div>
              <div>
                <dt className="label text-mute">Model</dt>
                <dd className="mt-1">Version {item.modelVersion}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
};

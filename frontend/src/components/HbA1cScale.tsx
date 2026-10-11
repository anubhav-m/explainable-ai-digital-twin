import { STATUS_INFO, classifyHbA1c } from '../utils/features';
import type { HbA1cStatus } from '../utils/features';

// HbA1c status is always shown as a colored mark + label, never color alone
export const StatusBadge = ({ value, withRange = false }: { value: number; withRange?: boolean }) => {
  const status = STATUS_INFO[classifyHbA1c(value)];
  return (
    <span className="label inline-flex items-center gap-2.5 whitespace-nowrap border border-ink px-3 py-[7px]">
      <span className="h-[9px] w-[9px] shrink-0" style={{ backgroundColor: status.color }} />
      {status.label}{withRange && ` · ${status.range}`}
    </span>
  );
};

type ScaleMarker = { label: string; value: number; hollow?: boolean };

// One fixed scale everywhere, so any two readings compare by eye; it only stretches for values beyond it
const SCALE_MIN = 4.5;
const SCALE_MAX = 7.5;
const BANDS: { status: HbA1cStatus; from: number; to?: number }[] = [
  { status: 'normal', from: SCALE_MIN, to: 5.7 },
  { status: 'prediabetes', from: 5.7, to: 6.5 },
  { status: 'diabetes', from: 6.5 },
];

// Where values sit on the clinical HbA1c scale; two markers draw a before -> after dumbbell
export const HbA1cScale = ({ markers }: { markers: ScaleMarker[] }) => {
  const max = Math.max(SCALE_MAX, Math.ceil(Math.max(...markers.map((m) => m.value)) + 0.5));
  const pct = (v: number) => ((Math.min(Math.max(v, SCALE_MIN), max) - SCALE_MIN) / (max - SCALE_MIN)) * 100;
  // Markers too close for side-by-side labels: the second label moves below the line, and only then is that row reserved
  const crowded = markers.length === 2 && Math.abs(pct(markers[0].value) - pct(markers[1].value)) < 30;
  const align = (p: number) => (p < 14 ? 'translate-x-0' : p > 86 ? '-translate-x-full' : '-translate-x-1/2');

  return (
    <div role="img" aria-label={markers.map((m) => `${m.label}: ${m.value.toFixed(2)}%`).join(', ')}>
      <div className={`relative ${crowded ? 'h-[98px]' : 'h-[76px]'}`}>
        {markers.map((m, i) => (
          <span
            key={m.label}
            className={`label marker absolute whitespace-nowrap ${align(pct(m.value))} ${crowded && i === 1 ? 'top-[50px]' : 'top-0'}`}
            style={{ left: `${pct(m.value)}%` }}
          >
            {m.label} {m.value.toFixed(2)}%
          </span>
        ))}

        <div className="absolute inset-x-0 top-[34px] h-px bg-ink">
          {[SCALE_MIN, 5.7, 6.5, max].map((tick) => (
            <span key={tick} className="absolute -top-[5px] h-[11px] w-px bg-ink" style={{ left: `${pct(tick)}%` }} />
          ))}
          {markers.length === 2 && (
            <span
              className="absolute -top-px h-[3px] bg-ink"
              style={{ left: `${Math.min(pct(markers[0].value), pct(markers[1].value))}%`, width: `${Math.abs(pct(markers[0].value) - pct(markers[1].value))}%` }}
            />
          )}
          {markers.map((m) => (
            <span
              key={m.label}
              className="marker absolute -top-2 h-[17px] w-[17px] -translate-x-1/2 rounded-full border-2 border-ink"
              style={{ left: `${pct(m.value)}%`, backgroundColor: m.hollow ? 'var(--sheet)' : 'var(--ink)' }}
            />
          ))}
        </div>

        {/* The three clinical ranges, drawn under the line in their status colors */}
        <div className={`absolute inset-x-0 flex h-[3px] gap-px ${crowded ? 'top-[72px]' : 'top-[50px]'}`}>
          {BANDS.map((band) => (
            <span key={band.status} style={{ width: `${pct(band.to ?? max) - pct(band.from)}%`, backgroundColor: STATUS_INFO[band.status].color }} />
          ))}
        </div>
        <div className={`label absolute inset-x-0 text-mute ${crowded ? 'top-[82px]' : 'top-[60px]'}`}>
          {[SCALE_MIN, 5.7, 6.5, max].map((tick) => (
            <span key={tick} className={`absolute ${align(pct(tick))}`} style={{ left: `${pct(tick)}%` }}>{tick}</span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-mute">
        {BANDS.map((band) => (
          <span key={band.status} className="inline-flex items-center gap-2">
            <span className="h-[9px] w-[9px]" style={{ backgroundColor: STATUS_INFO[band.status].color }} />
            {STATUS_INFO[band.status].label}
          </span>
        ))}
      </div>
    </div>
  );
};

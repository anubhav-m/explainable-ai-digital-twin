import React from 'react';
import { featureLabel, formatValue, groupShap } from '../utils/features';
import { signed } from './ui';

export type ShapRow = { code: string; feature: string; value: number; display: string };

// One row per original input, largest push first
export const shapRows = (prediction: any): ShapRow[] => {
  const inputs = prediction.inputs || {};
  return Object.entries(groupShap(prediction.shap_local || {}))
    .map(([code, value]) => ({ code, feature: featureLabel(code), value, display: formatValue(code, inputs[code]) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
};

// Pushes up are filled bars to the right of the centreline, pulls down are outlined bars to the left
export const ShapRows = ({ rows }: { rows: ShapRow[] }) => {
  const extent = Math.max(...rows.map((r) => Math.abs(r.value)), 0.01) * 1.08;
  return (
    <div className="rows" role="table" aria-label="How each input moved the estimate">
      {rows.map((row, i) => {
        const width = (Math.abs(row.value) / extent) * 50;
        const up = row.value >= 0;
        return (
          <div key={row.code} role="row" className="row grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_64px] items-center gap-x-4 border-t border-hair py-[13px] last:border-b sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,2fr)_64px]">
            <span role="cell">{row.feature}</span>
            <span role="cell" className="text-mute">{row.display}</span>
            <span role="cell" aria-hidden className="relative col-span-3 row-start-2 mt-3 h-3 sm:col-span-1 sm:row-start-auto sm:mt-0">
              <span className="absolute left-1/2 -top-1.5 h-6 w-px bg-hair" />
              <span
                className={`absolute top-0 h-3 ${up ? 'bar-up bg-ink' : 'bar-down border border-ink'}`}
                style={{ '--i': i, width: `${Math.max(width, 0.6)}%`, left: up ? '50%' : `${50 - width}%` } as React.CSSProperties}
              />
            </span>
            {/* Measurements are set in the mono face so the decimals line up down the column */}
            <span role="cell" className="text-right font-mono text-[15px]">{signed(row.value)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ShapLegend = () => (
  <div className="label flex flex-wrap gap-x-6 gap-y-1 text-mute">
    <span className="flex items-center gap-2"><span className="h-2.5 w-5 bg-ink" />Pushes the estimate up</span>
    <span className="flex items-center gap-2"><span className="h-2.5 w-5 border border-ink" />Pulls it down</span>
  </div>
);

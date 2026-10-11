type TooltipRow = { name: string; value: string; hollow?: boolean };

// Values lead and series names follow; each row is keyed by the same mark the chart draws
export const TooltipCard = ({ title, rows }: { title: string; rows: TooltipRow[] }) => (
  <div className="border border-ink bg-sheet px-3 py-2.5 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)]">
    <p className="label mb-1.5 text-mute">{title}</p>
    {rows.map((row) => (
      <div key={row.name} className="flex items-center gap-2.5 py-0.5 text-sm">
        <span className="h-2.5 w-2.5 rounded-full border border-ink" style={{ backgroundColor: row.hollow ? 'var(--seal)' : 'var(--ink)' }} />
        <span className="font-medium">{row.value}</span>
        <span className="text-mute">{row.name}</span>
      </div>
    ))}
  </div>
);

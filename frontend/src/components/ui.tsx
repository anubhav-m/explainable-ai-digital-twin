import React, { useEffect, useId, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';

type PlateProps = { children: React.ReactNode; className?: string; i?: number; label?: string; landed?: boolean };

// The full entrance (plates stepping in, the estimate counting up) belongs to the first screen after load only
export const entrance = { active: true };

// One registered plate; i staggers its entrance. A landed plate replaces a skeleton: frame and crosshairs stay put, only its contents fade in
export const Plate = ({ children, className = '', i = 0, label, landed = false }: PlateProps) => (
  <section aria-label={label} className={`plate ${landed ? 'landed' : ''} ${className}`} style={{ '--i': i } as React.CSSProperties}>
    {children}
  </section>
);

export const Sk = ({ className = '' }: { className?: string }) => <span aria-hidden className={`sk ${className}`} />;

// Page title with its technical term kept on the same line for evaluators
export const PageHead = ({ title, term, children, action }: { title: string; term: string; children?: React.ReactNode; action?: React.ReactNode }) => (
  <header className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-[2.5rem] leading-[1.05] tracking-[-0.02em]">{title}</h1>
        <span className="label text-mute">{term}</span>
      </div>
      {children && <p className="mt-3 max-w-[62ch] text-mute">{children}</p>}
    </div>
    {action}
  </header>
);

export const ErrorNote = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-wrap items-center gap-4 border border-ink px-4 py-3">
    <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: 'var(--st-diabetes)' }} />
    <p className="flex-1">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn btn-outline">
        <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} /> Try again
      </button>
    )}
  </div>
);

// A void on the sheet: dot matrix, one sentence, one way forward
export const EmptyNote = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Plate className="dots flex min-h-[320px] flex-col items-start justify-end">
    <div className="max-w-[46ch] bg-sheet p-5">
      <h2 className="text-2xl leading-tight tracking-[-0.01em]">{title}</h2>
      <p className="mt-2 text-mute">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  </Plate>
);

// The stamp that signs a plate: a slowly turning ring of text around a fixed centre
export const Seal = ({ ring, children, className = '' }: { ring: string; children: React.ReactNode; className?: string }) => {
  const id = useId();
  return (
    <div className={`seal relative h-[112px] w-[112px] shrink-0 ${className}`} role="img" aria-label={ring.replace(/ · /g, ', ')}>
      <svg viewBox="0 0 112 112" className="absolute inset-0" aria-hidden>
        <circle cx="56" cy="56" r="56" fill="var(--seal)" />
        <g className="seal-ring">
          <defs>
            <path id={id} d="M56,56 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0" />
          </defs>
          <text fill="var(--ink)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2.2">
            <textPath href={`#${id}`} textLength="266">{ring}</textPath>
          </text>
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center text-[17px] leading-none">{children}</div>
    </div>
  );
};

// Counts toward a value on an exponential ease-out; lands exactly on the target.
// It runs on the first screen after load and whenever the value itself changes, never on a plain revisit.
export const useCountUp = (target: number, ms = 1000) => {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(() => (reduced || !entrance.active ? target : Math.max(target - 0.6, 0)));
  const shown = useRef(value);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      const next = p === 1 ? target : from + (target - from) * (1 - Math.pow(2, -10 * p));
      shown.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);

  return value;
};

export const signed = (v: number, digits = 2) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;

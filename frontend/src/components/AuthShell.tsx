import React from 'react';
import { ThemeToggle } from '../App';
import { HbA1cScale } from './HbA1cScale';
import { Plate, Seal } from './ui';

type Props = { title: string; lede: string; error: string; children: React.ReactNode; footer: React.ReactNode };

// Shared sheet for sign-in and sign-up: what the product does on the left, the form plate on the right
export const AuthShell = ({ title, lede, error, children, footer }: Props) => (
  <div className="flex min-h-screen flex-col">
    <header className="border-b border-hair">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
        <span className="text-[17px] font-semibold">Explainable AI Digital Twin</span>
        <ThemeToggle />
      </div>
    </header>

    <main data-entrance="true" className="view mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-x-16 gap-y-12 px-5 py-12 sm:px-8 lg:grid-cols-12 lg:px-14">
      <div className="lg:col-span-7">
        <p className="max-w-[16ch] text-[clamp(2.75rem,5.4vw,5.5rem)] leading-[0.98] tracking-[-0.03em]">
          Your diabetes risk, with its reasons.
        </p>
        <p className="mt-6 max-w-[48ch] text-lg text-mute">
          Log a visit and your twin estimates your HbA1c, shows which of your numbers moved it, and lets you try a change before you make it.
        </p>
        <div className="relative mt-12 hidden max-w-[560px] sm:block">
          <Seal ring="MODEL ESTIMATE · NOT A DIAGNOSIS · " className="!absolute -top-6 right-0">Est.</Seal>
          <div className="dots mb-6 h-16 w-40" aria-hidden />
          <HbA1cScale markers={[{ label: 'Example', value: 5.9 }]} />
        </div>
      </div>

      <Plate className="bg-sheet lg:col-span-5" i={1} label={title}>
        <h1 className="text-[2rem] leading-tight tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-mute">{lede}</p>

        {error && (
          <div role="alert" className="mt-6 flex items-center gap-3 border border-ink px-4 py-3">
            <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: 'var(--st-diabetes)' }} />
            {error}
          </div>
        )}

        {children}

        <p className="mt-6 text-mute">{footer}</p>
      </Plate>
    </main>
  </div>
);

export const AuthField = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="label mb-2 block text-mute">{label}</span>
    <input {...props} className="field" required />
  </label>
);

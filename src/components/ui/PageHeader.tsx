// PageHeader: page title row with a subtitle and the page's actions (the demo's pageHead({ title, sub, actions })).
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  /** Buttons on the right; the one ink-black primary action goes here. */
  actions?: ReactNode;
}

export function PageHeader({ title, sub, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-ink3">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

// StatGrid: compact key figures in one panel (the demo's statGrid(cells, label)). No hero KPI cards.
import type { ReactNode } from 'react';
import { cx } from './cx';
import { InfoTip } from './InfoTip';

export interface StatCell {
  label: string;
  value: ReactNode;
  /** Muted line under the value. */
  sub?: ReactNode;
  /** Explanation shown in a popover behind an (i) button next to the label. */
  tip?: string;
  /** Extra classes for the value, for example `text-crit-fg` when the figure is bad. */
  className?: string;
}

export interface StatGridProps {
  cells: readonly StatCell[];
  /** Accessible name of the group. */
  label?: string;
}

// Full class names so Tailwind can see them; any other count falls back to four columns like the demo.
const COLUMNS: Record<number, string> = {
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

export function StatGrid({ cells, label = 'Key figures' }: StatGridProps) {
  const count = cells.length;
  return (
    <section
      className={cx('panel mb-4 grid grid-cols-2', COLUMNS[count] ?? 'md:grid-cols-4')}
      aria-label={label}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cx(
            'min-w-0 border-line p-3 sm:p-3.5',
            // An odd last cell spans both columns on mobile so it is not left half empty.
            i === count - 1 && count % 2 === 1 && 'col-span-2 md:col-span-1',
            i > 0 && 'md:border-s',
            i % 2 === 1 && 'border-s',
            i > 1 && 'border-t md:border-t-0',
          )}
        >
          <p className="text-xs text-ink3">
            {cell.label}
            {cell.tip && <InfoTip title={cell.label} note={cell.tip} />}
          </p>
          <p className={cx('mt-0.5 text-2xl font-semibold tabular-nums tracking-tight', cell.className)}>
            {cell.value}
          </p>
          {cell.sub && <p className="mt-0.5 text-xs text-ink3">{cell.sub}</p>}
        </div>
      ))}
    </section>
  );
}

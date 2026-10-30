// StatStrip: the five key figures in one panel, each with its change against the previous period and an (i) note.
// Ports statStrip() of 40-p-dashboard.js. No hero KPI cards: a slim scoreboard under the title.
import { cx, InfoTip, SkeletonStat } from '@/components/ui';
import { statCells } from '../lib/stats';
import { periodTag } from '../lib/labels';
import type { Dashboard, DashboardDays } from '../types';
import { Delta } from './Delta';

export interface StatStripProps {
  /** `undefined` while the dashboard loads: the strip shows its skeleton. */
  stats: Dashboard['stats'] | undefined;
  days: DashboardDays;
}

/** One panel with the five key figures; a skeleton while the stats load. Each cell opens its note from the (i) button. */
export function StatStrip({ stats, days }: StatStripProps) {
  if (!stats) return <SkeletonStat cells={5} />;
  const cells = statCells(stats.current, stats.previous, days);
  return (
    <section
      className="panel mb-4 grid grid-cols-2 md:grid-cols-5"
      aria-label={`Key figures for the last ${periodTag(days)}`}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          // Two columns on mobile: the odd fifth cell spans both so no half-row hole is left.
          className={cx(
            'border-line',
            i === 4 && 'col-span-2 md:col-span-1',
            i > 0 && 'md:border-s',
            i % 2 === 1 && i < 4 && 'border-s',
            i > 1 && 'border-t md:border-t-0',
          )}
        >
          <div className="min-w-0 p-3 sm:p-3.5">
            <p className="text-xs text-ink3">
              {cell.label}
              <InfoTip title={cell.label} note={cell.note} />
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{cell.value}</p>
              <p className="text-xs">
                <Delta change={cell.change} />
              </p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

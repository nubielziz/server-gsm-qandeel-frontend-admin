// KpiCell: one tile of the KPI row. It owns the state of its own read, so one failing source shows its problem here while
// the other tiles keep their figures (docs/system-health-design.md, "KPI row").
import { useId } from 'react';
import { Badge } from '@/components/ui';
import { formatAgo, isStale } from '../lib';
import { KpiProblem } from './KpiProblem';
import { KpiValue } from './KpiValue';
import type { KpiModel } from './useKpis';

export interface KpiCellProps {
  model: KpiModel;
  /** The clock of the row (epoch ms), so the six tiles judge "stale" by the same time. */
  now: number;
}

/**
 * Label, then the figure when there is one. Last good data stays on screen after a failed refresh or when it is older
 * than two poll intervals, and a "Stale" badge says so; a tile without any figure shows its problem instead.
 */
export function KpiCell({ model, now }: KpiCellProps) {
  const { label, query, figure, interval } = model;
  const labelId = useId();
  const failed = query.isError;
  const stale = figure !== null && (failed || isStale(query.dataUpdatedAt, now, interval));
  const staleWhy = failed
    ? `The last update failed. Showing the figure from ${formatAgo(now - query.dataUpdatedAt)}.`
    : `Updated ${formatAgo(now - query.dataUpdatedAt)}.`;
  return (
    <div role="group" aria-labelledby={labelId} className="min-w-0 bg-surface p-3 sm:p-3.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <p id={labelId} className="text-xs text-ink3">
          {label}
        </p>
        {stale && (
          <span title={staleWhy}>
            <Badge tone="warn" icon="clock">
              Stale
            </Badge>
          </span>
        )}
      </div>
      {figure ? <KpiValue figure={figure} /> : <KpiProblem query={query} />}
    </div>
  );
}

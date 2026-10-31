// KpiValue: what a KPI tile shows once its answer is there: the value with its unit, the server's state as a badge, a small
// trend line and the server's threshold. Part of the KPI row (docs/system-health-design.md, "KPI row").
import { Sparkline } from '@/components/charts';
import { cx } from '@/components/ui';
import { HealthBadge } from '../components/HealthBadge';
import { formatMeasure, thresholdText } from '../lib';
import { hasTrend, type KpiFigure } from './kpi';

/**
 * The state is the server's: the badge prints `measure.state` and nothing is compared here. A missing value (null) prints
 * "No data" in neutral grey and gets no badge, so no data is never drawn as OK. The trend uses the quiet ink colour.
 */
export function KpiValue({ figure }: { figure: KpiFigure }) {
  const { measure, trend } = figure;
  const noData = measure.value === null;
  const limit = figure.threshold
    ? thresholdText(measure, figure.thresholdWord ? { warnLabel: figure.thresholdWord } : undefined)
    : null;
  const line = limit ?? figure.note ?? null;
  return (
    <>
      {/* On a phone the badge always sits under the value, so the two tiles of a row line up whatever the value. */}
      <div className="mt-1 flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
        <span
          className={cx(
            'tabular-nums tracking-tight',
            noData ? 'text-base font-medium text-ink3' : 'text-2xl font-semibold',
          )}
        >
          {formatMeasure(measure)}
        </span>
        {!noData && <HealthBadge status={measure.state} />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink3">
        {hasTrend(trend) ? (
          <>
            <Sparkline
              values={trend.map((point) => point.value)}
              width={72}
              height={18}
              min={figure.zeroBased ? 0 : undefined}
            />
            <span>{figure.trendLabel}</span>
          </>
        ) : (
          <span>No trend data</span>
        )}
      </div>
      {line && <p className="mt-1 text-xs text-ink3">{line}</p>}
    </>
  );
}

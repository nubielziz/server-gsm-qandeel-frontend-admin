// ChartLegend: series toggles with totals. Ports stackLegend(rows) and the legend action of 30-charts.js.
import { SERIES, colorVar, type SeriesDef, type StackedRow } from './chartSeries';
import { formatNumber, sum } from './scale';

export interface ChartLegendProps {
  rows: readonly StackedRow[];
  series?: readonly SeriesDef[];
  /** Keys that are switched off. */
  hidden?: ReadonlySet<string>;
  /** Makes the items toggle buttons (see useSeriesVisibility). Without it the legend is plain text. */
  onToggle?: (key: string) => void;
}

/** The swatch is outlined when the series is off, and the label is struck through, so state is not colour alone. */
export function ChartLegend({ rows, series = SERIES, hidden, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1" role="group" aria-label="Series">
      {series.map((s) => {
        const off = hidden?.has(s.key) ?? false;
        const color = colorVar(s.color);
        const content = (
          <>
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: off ? 'transparent' : color, boxShadow: `inset 0 0 0 1px ${color}` }}
            />
            <span className={off ? 'line-through' : undefined}>{s.label}</span>
            <span className="tabular-nums text-ink3">
              {formatNumber(sum(rows, (r) => r.values[s.key] ?? 0))}
            </span>
          </>
        );
        const base = `inline-flex h-6 items-center gap-1.5 rounded px-1.5 text-xs ${off ? 'text-ink3' : 'text-ink2'}`;
        return onToggle ? (
          <button
            key={s.key}
            type="button"
            className={`${base} hover:bg-hover`}
            aria-pressed={!off}
            onClick={() => onToggle(s.key)}
          >
            {content}
          </button>
        ) : (
          <span key={s.key} className={base}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

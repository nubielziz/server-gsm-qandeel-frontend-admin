// StackedBarChart: one stacked bar per period, split by series, with tooltip and keyboard. Ports drawStacked() of 30-charts.js.
import { Fragment, useMemo, type PointerEvent } from 'react';
import { ChartTooltip } from './ChartTooltip';
import { SERIES, colorVar, type SeriesDef, type StackedRow } from './chartSeries';
import { clamp, compactNumber, formatNumber } from './scale';
import { STACKED_MARGIN, layoutStacked, roundedTopPath } from './stackedLayout';
import { useChartCursor } from './useChartCursor';
import { useElementWidth } from './useElementWidth';

export interface StackedBarChartProps {
  rows: readonly StackedRow[];
  /** Defaults to the four service types. */
  series?: readonly SeriesDef[];
  height?: number;
  /** Keys switched off in the legend (see useSeriesVisibility). */
  hidden?: ReadonlySet<string>;
  /** Formats values in the tooltip. */
  formatValue?: (n: number) => string;
  /** Formats the y-axis labels. */
  formatAxis?: (n: number) => string;
  /** What is counted ("orders"), spoken with the live value. */
  unit?: string;
  /** Accessible name of the chart; pair the chart with a SeriesTable for the data. */
  label: string;
}

/**
 * Colours come from CSS variables, so a theme change needs no redraw. The box is focusable: ArrowLeft/Right
 * step through the periods and Escape hides the tooltip. The SVG is hidden from assistive tech; its numbers
 * are announced through a live region and are also available as a table.
 */
export function StackedBarChart({
  rows,
  series = SERIES,
  height = 220,
  hidden,
  formatValue = formatNumber,
  formatAxis = compactNumber,
  unit = 'orders',
  label,
}: StackedBarChartProps) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const visible = useMemo(() => series.filter((s) => !hidden?.has(s.key)), [series, hidden]);
  const layout = useMemo(
    () => (width > 20 && rows.length ? layoutStacked(rows, visible, width, height) : null),
    [rows, visible, width, height],
  );
  const cursor = useChartCursor(rows.length, (index) => ({
    x: layout?.barCenter(index) ?? 0,
    y: STACKED_MARGIN.top + 30,
  }));
  const row = layout && cursor.active !== null ? rows[cursor.active] : null;

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!layout) return;
    const box = e.currentTarget.getBoundingClientRect();
    const index = clamp(
      Math.floor((e.clientX - box.left - STACKED_MARGIN.left) / layout.band),
      0,
      rows.length - 1,
    );
    cursor.show(index, layout.barCenter(index), e.clientY - box.top);
  }

  const live =
    row && layout && cursor.active !== null
      ? `${row.label}: ${formatValue(layout.totals[cursor.active])} ${unit}. ` +
        visible.map((s) => `${s.label} ${row.values[s.key] ?? 0}`).join(', ')
      : '';

  return (
    <>
      <div
        ref={boxRef}
        className="relative"
        style={{ height }}
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={cursor.onKeyDown}
        onBlur={cursor.hide}
      >
        {layout && (
          <>
            <svg
              className="viz block"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              aria-hidden="true"
              onPointerMove={onPointerMove}
              onPointerLeave={cursor.hide}
            >
              {layout.ticks.map((tick, i) => (
                <g key={i}>
                  <line
                    className={i ? 'grid' : 'axis'}
                    x1={STACKED_MARGIN.left}
                    x2={width - STACKED_MARGIN.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text x={STACKED_MARGIN.left - 6} y={tick.y + 4} textAnchor="end">
                    {formatAxis(tick.value)}
                  </text>
                </g>
              ))}
              {layout.bars.map((bar) => (
                <Fragment key={bar.index}>
                  <g className={cursor.active !== null && cursor.active !== bar.index ? 'bar dim' : 'bar'}>
                    {bar.segments.map((seg) =>
                      seg.radius > 0.5 ? (
                        <path key={seg.key} d={roundedTopPath(seg)} fill={colorVar(seg.color)} />
                      ) : (
                        <rect
                          key={seg.key}
                          x={seg.x}
                          y={seg.y}
                          width={seg.width}
                          height={seg.height}
                          fill={colorVar(seg.color)}
                        />
                      ),
                    )}
                  </g>
                  {layout.showLabel(bar.index) && (
                    <text x={layout.barCenter(bar.index)} y={height - 6} textAnchor="middle">
                      {rows[bar.index].label}
                    </text>
                  )}
                </Fragment>
              ))}
              <rect className="hit" x={STACKED_MARGIN.left} y={0} width={layout.plotWidth} height={height} />
            </svg>
            {row && cursor.active !== null && (
              <ChartTooltip x={cursor.anchor.x} y={cursor.anchor.y} boxWidth={width} boxHeight={height}>
                <div className="mb-1.5 font-medium">{row.label}</div>
                {visible.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-none rounded-sm"
                      style={{ background: colorVar(s.color) }}
                    />
                    <span className="flex-1 text-ink2">{s.label}</span>
                    <span className="font-medium tabular-nums">{formatValue(row.values[s.key] ?? 0)}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex justify-between border-t border-line pt-1.5">
                  <span className="text-ink2">Total</span>
                  <span className="font-medium tabular-nums">
                    {formatValue(layout.totals[cursor.active])}
                  </span>
                </div>
              </ChartTooltip>
            )}
          </>
        )}
      </div>
      {/* Outside the role="img" box: its children are presentational and would not be announced. */}
      <div className="sr-only" aria-live="polite">
        {live}
      </div>
    </>
  );
}

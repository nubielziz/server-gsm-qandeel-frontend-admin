// LineChart: one line with a soft area, tooltip, keyboard and an optional threshold. Ports drawLine() of 30-charts.js.
// Points without a value are gaps ("No data" in the tooltip), never zeros.
import { useId, useMemo, type PointerEvent } from 'react';
import { ChartTooltip } from './ChartTooltip';
import { colorVar, type ChartColor } from './chartSeries';
import { LINE_MARGIN, layoutLine, type LinePoint, type LineReference } from './lineLayout';
import { clamp, formatNumber } from './scale';
import { useChartCursor } from './useChartCursor';
import { useElementWidth } from './useElementWidth';

export type { LinePoint, LineReference };

export interface LineChartProps {
  points: readonly LinePoint[];
  height?: number;
  color?: ChartColor;
  /** Formats y-axis labels and tooltip values. */
  formatValue?: (n: number) => string;
  /** Formats the y-axis labels only, when they need another style than the tooltip (bare numbers under a caption). */
  formatAxis?: (n: number) => string;
  /** Fixed top of the axis (for percentages). Default: a round number above the biggest value. */
  yMax?: number;
  yMin?: number;
  /** Appended to the value in the tooltip ("%"). */
  unit?: string;
  /** Number of gridline intervals. */
  ticks?: number;
  /** Dashed threshold; the stretch of the line on its bad side (below by default) is redrawn in the critical colour. */
  reference?: LineReference;
  /** Accessible name of the chart. */
  label: string;
}

/** Same behaviour as StackedBarChart: variable colours, focusable box, arrow keys, live region. */
export function LineChart({
  points,
  height = 160,
  color = 's1',
  formatValue = formatNumber,
  formatAxis = formatValue,
  yMax,
  yMin = 0,
  unit = '',
  ticks = 3,
  reference,
  label,
}: LineChartProps) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const layout = useMemo(
    () =>
      width > 20 && points.length
        ? layoutLine(points, width, height, { yMax, yMin, ticks, reference })
        : null,
    [points, width, height, yMax, yMin, ticks, reference],
  );
  // A gap has no y of its own: the tooltip then sits in the middle of the plot.
  const pointY = (index: number) => {
    if (!layout) return 0;
    const value = points[index].value;
    return value === null
      ? LINE_MARGIN.top + (height - LINE_MARGIN.top - LINE_MARGIN.bottom) / 2
      : layout.y(value);
  };
  const cursor = useChartCursor(points.length, (index) => ({ x: layout?.x(index) ?? 0, y: pointY(index) }));
  const point = cursor.active !== null ? points[cursor.active] : null;

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!layout) return;
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - box.left - LINE_MARGIN.left) / layout.plotWidth;
    const index = clamp(Math.round(ratio * (points.length - 1)), 0, points.length - 1);
    cursor.show(index, layout.x(index), pointY(index));
  }

  const stroke = colorVar(color);
  const valueText = (value: number | null) => (value === null ? 'No data' : `${formatValue(value)}${unit}`);
  const live = point ? `${point.detail ?? point.label}: ${valueText(point.value)}` : '';
  // The clip keeps the critical overlay on the bad side of the threshold only.
  const badAbove = reference?.bad === 'above';
  const refY = layout?.referenceY ?? 0;
  // The label sits just above the dashed line, or under it when the line is too close to the top.
  const refLabelY = refY - 4 >= LINE_MARGIN.top + 10 ? refY - 4 : refY + 12;

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
                    x1={LINE_MARGIN.left}
                    x2={width - LINE_MARGIN.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text x={LINE_MARGIN.left - 6} y={tick.y + 4} textAnchor="end">
                    {formatAxis(tick.value)}
                  </text>
                </g>
              ))}
              {layout.xLabels.map((l, i) => (
                <text key={i} x={l.x.toFixed(1)} y={height - 6} textAnchor="middle">
                  {l.text}
                </text>
              ))}
              <path d={layout.areaPath} fill={stroke} opacity=".08" />
              <path
                d={layout.linePath}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {reference && layout.referenceY !== null && (
                <>
                  <clipPath id={clipId}>
                    <rect
                      x="0"
                      y={badAbove ? 0 : refY}
                      width={width}
                      height={Math.max(0, badAbove ? refY : height - refY)}
                    />
                  </clipPath>
                  <line
                    x1={LINE_MARGIN.left}
                    x2={width - LINE_MARGIN.right}
                    y1={layout.referenceY}
                    y2={layout.referenceY}
                    stroke="rgb(var(--ink3))"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <text x={LINE_MARGIN.left + 4} y={refLabelY} textAnchor="start">
                    {reference.label}
                  </text>
                  <path
                    d={layout.linePath}
                    fill="none"
                    stroke="rgb(var(--crit-dot))"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    clipPath={`url(#${clipId})`}
                  />
                </>
              )}
              {layout.isolated.map((index) => (
                <circle
                  key={index}
                  cx={layout.x(index)}
                  cy={layout.y(points[index].value as number)}
                  r="2"
                  fill={stroke}
                />
              ))}
              {point && cursor.active !== null && (
                <>
                  <line
                    x1={layout.x(cursor.active)}
                    x2={layout.x(cursor.active)}
                    y1={LINE_MARGIN.top}
                    y2={height - LINE_MARGIN.bottom}
                    stroke="rgb(var(--line2))"
                    strokeWidth="1"
                  />
                  {point.value !== null && (
                    <circle
                      cx={layout.x(cursor.active)}
                      cy={layout.y(point.value)}
                      r="4"
                      fill={stroke}
                      stroke="rgb(var(--surface))"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}
              <rect className="hit" x={LINE_MARGIN.left} y={0} width={layout.plotWidth} height={height} />
            </svg>
            {point && (
              <ChartTooltip x={cursor.anchor.x} y={cursor.anchor.y} boxWidth={width} boxHeight={height}>
                <div className="font-medium">{valueText(point.value)}</div>
                <div className="text-ink3">{point.detail ?? point.label}</div>
              </ChartTooltip>
            )}
          </>
        )}
      </div>
      <div className="sr-only" aria-live="polite">
        {live}
      </div>
    </>
  );
}

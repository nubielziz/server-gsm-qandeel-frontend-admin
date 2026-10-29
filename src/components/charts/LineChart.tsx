// LineChart: one line with a soft area, tooltip, keyboard and an optional threshold. Ports drawLine() of 30-charts.js.
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
  /** Fixed top of the axis (for percentages). Default: a round number above the biggest value. */
  yMax?: number;
  yMin?: number;
  /** Appended to the value in the tooltip ("%"). */
  unit?: string;
  /** Number of gridline intervals. */
  ticks?: number;
  /** Dashed threshold; the stretch of the line below it is redrawn in the critical colour. */
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
  const cursor = useChartCursor(points.length, (index) => ({
    x: layout?.x(index) ?? 0,
    y: layout?.y(points[index].value) ?? 0,
  }));
  const point = cursor.active !== null ? points[cursor.active] : null;

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!layout) return;
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - box.left - LINE_MARGIN.left) / layout.plotWidth;
    const index = clamp(Math.round(ratio * (points.length - 1)), 0, points.length - 1);
    cursor.show(index, layout.x(index), layout.y(points[index].value));
  }

  const stroke = colorVar(color);
  const live = point ? `${point.detail ?? point.label}: ${formatValue(point.value)}${unit}` : '';

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
                    {formatValue(tick.value)}
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
                      y={layout.referenceY}
                      width={width}
                      height={Math.max(0, height - layout.referenceY)}
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
                  <text x={LINE_MARGIN.left + 4} y={layout.referenceY + 12} textAnchor="start">
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
                  <circle
                    cx={layout.x(cursor.active)}
                    cy={layout.y(point.value)}
                    r="4"
                    fill={stroke}
                    stroke="rgb(var(--surface))"
                    strokeWidth="2"
                  />
                </>
              )}
              <rect className="hit" x={LINE_MARGIN.left} y={0} width={layout.plotWidth} height={height} />
            </svg>
            {point && (
              <ChartTooltip x={cursor.anchor.x} y={cursor.anchor.y} boxWidth={width} boxHeight={height}>
                <div className="font-medium">
                  {formatValue(point.value)}
                  {unit}
                </div>
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

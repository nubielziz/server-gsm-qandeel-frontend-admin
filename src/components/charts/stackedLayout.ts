// Geometry of the stacked bar chart as plain data, so the SVG component only maps it. Ports the maths of drawStacked().
import type { ChartColor, SeriesDef, StackedRow } from './chartSeries';
import { clamp, niceStep, sum } from './scale';

export const STACKED_MARGIN = { top: 8, right: 6, bottom: 24, left: 30 } as const;

export interface StackSegment {
  key: string;
  color: ChartColor;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius of the top segment's upper corners; 0 means a plain rectangle. */
  radius: number;
}

export interface StackedLayout {
  plotWidth: number;
  /** Width of the slot of one bar. */
  band: number;
  ticks: Array<{ value: number; y: number }>;
  bars: Array<{ index: number; segments: StackSegment[] }>;
  /** Visible total of every row. */
  totals: number[];
  /** Whether the row's category label is drawn (every row, every 2nd, every 5th, depending on how many). */
  showLabel: (index: number) => boolean;
  barCenter: (index: number) => number;
}

/** Four gridlines above the axis; the top is the next round number above the biggest visible total. */
export function layoutStacked(
  rows: readonly StackedRow[],
  visible: readonly SeriesDef[],
  width: number,
  height: number,
): StackedLayout {
  const m = STACKED_MARGIN;
  const totals = rows.map((row) => sum(visible, (s) => row.values[s.key] ?? 0));
  const step = niceStep(Math.max(1, ...totals) / 4);
  const yMax = step * 4;
  const plotWidth = width - m.left - m.right;
  const plotHeight = height - m.top - m.bottom;
  const band = plotWidth / rows.length;
  const barWidth = clamp(band * 0.58, 5, 26);
  const y = (value: number) => m.top + plotHeight - (value / yMax) * plotHeight;
  const every = rows.length <= 8 ? 1 : rows.length <= 16 ? 2 : rows.length <= 31 ? 5 : 1;

  const ticks = [0, 1, 2, 3, 4].map((i) => ({ value: i * step, y: Math.round(y(i * step)) + 0.5 }));

  const bars = rows.map((row, index) => {
    const x = m.left + band * index + (band - barWidth) / 2;
    const live = visible.filter((s) => (row.values[s.key] ?? 0) > 0);
    let stacked = 0;
    const segments = live.map((s, position) => {
      const value = row.values[s.key] ?? 0;
      const top = y(stacked + value);
      // A 2px gap between stacked segments keeps the colours apart without borders.
      const bottom = y(stacked) - (position ? 2 : 0);
      const segmentHeight = Math.max(1, bottom - top);
      stacked += value;
      const isTop = position === live.length - 1;
      return {
        key: s.key,
        color: s.color,
        x,
        y: top,
        width: barWidth,
        height: segmentHeight,
        radius: isTop ? Math.min(3, segmentHeight / 2) : 0,
      };
    });
    return { index, segments };
  });

  return {
    plotWidth,
    band,
    ticks,
    bars,
    totals,
    showLabel: (index) => index % every === 0 || (index === rows.length - 1 && every === 1),
    barCenter: (index) => m.left + band * index + band / 2,
  };
}

/** Path of a bar segment with rounded upper corners (the top segment of a stack). */
export function roundedTopPath(s: StackSegment): string {
  const { x, y, width: w, height: h, radius: r } = s;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

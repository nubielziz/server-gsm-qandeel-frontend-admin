// Geometry of the line chart as plain data, so the SVG component only maps it. Ports the maths of drawLine().
import { clamp, niceStep } from './scale';

export const LINE_MARGIN = { top: 8, right: 8, bottom: 22, left: 38 } as const;

export interface LinePoint {
  value: number;
  /** Short x-axis label ("12 Oct"). */
  label: string;
  /** Longer label for the tooltip ("Mon, 12 Oct"). Defaults to `label`. */
  detail?: string;
}

export interface LineReference {
  value: number;
  /** Written on the dashed line ("SLA 95%"). */
  label: string;
}

export interface LineLayout {
  plotWidth: number;
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: Array<{ value: number; y: number }>;
  xLabels: Array<{ x: number; text: string }>;
  linePath: string;
  areaPath: string;
  /** y of the dashed threshold line, when a reference was given. */
  referenceY: number | null;
}

interface LineOptions {
  yMax?: number;
  yMin: number;
  ticks: number;
  reference?: LineReference;
}

export function layoutLine(
  points: readonly LinePoint[],
  width: number,
  height: number,
  { yMax, yMin, ticks: tickCount, reference }: LineOptions,
): LineLayout {
  const m = LINE_MARGIN;
  const count = points.length;
  const plotWidth = width - m.left - m.right;
  const plotHeight = height - m.top - m.bottom;
  const top = yMax ?? niceStep(Math.max(...points.map((p) => p.value)) / tickCount) * tickCount;
  const x = (index: number) => m.left + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number) => m.top + plotHeight - ((value - yMin) / (top - yMin)) * plotHeight;

  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const value = yMin + ((top - yMin) / tickCount) * i;
    return { value, y: Math.round(y(value)) + 0.5 };
  });

  // Roughly one label per 64px, always including the newest point.
  const step = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(plotWidth / 64))));
  const xLabels = points
    .map((p, i) => ({ x: clamp(x(i), m.left + 16, width - m.right - 16), text: p.label, i }))
    .filter(({ i }) => (count - 1 - i) % step === 0);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');

  return {
    plotWidth,
    x,
    y,
    ticks,
    xLabels,
    linePath: line,
    areaPath: `${line}L${x(count - 1)},${y(yMin)}L${x(0)},${y(yMin)}Z`,
    referenceY: reference ? Math.round(y(reference.value)) + 0.5 : null,
  };
}

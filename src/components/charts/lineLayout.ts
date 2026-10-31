// Geometry of the line chart as plain data, so the SVG component only maps it. Ports the maths of drawLine().
// Null values are gaps (no data): the line breaks there instead of dropping to zero.
import { clamp, niceStep } from './scale';

export const LINE_MARGIN = { top: 8, right: 8, bottom: 22, left: 38 } as const;

export interface LinePoint {
  /** The value at this point; null means no data, drawn as a break in the line. */
  value: number | null;
  /** Short x-axis label ("12 Oct"). */
  label: string;
  /** Longer label for the tooltip ("Mon, 12 Oct"). Defaults to `label`. */
  detail?: string;
}

export interface LineReference {
  value: number;
  /** Written on the dashed line ("SLA 95%"). */
  label: string;
  /**
   * Which side of the line is bad, redrawn in the critical colour: `below` (the default: success rates, SLA) or
   * `above` (latency, error rates).
   */
  bad?: 'above' | 'below';
}

export interface LineLayout {
  plotWidth: number;
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: Array<{ value: number; y: number }>;
  xLabels: Array<{ x: number; text: string }>;
  linePath: string;
  areaPath: string;
  /** Points with no neighbour on either side: a path cannot show them, so the chart draws a dot. */
  isolated: number[];
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
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  // The threshold counts towards the top, so the reader always sees how far the line is from it.
  const highest = Math.max(...values, reference?.value ?? -Infinity);
  const top =
    yMax ??
    (Number.isFinite(highest) && highest > yMin
      ? niceStep(highest / tickCount) * tickCount
      : yMin + tickCount);
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

  // One sub-path per unbroken run of values; the area closes each run on the baseline.
  let linePath = '';
  let areaPath = '';
  const isolated: number[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length === 1) isolated.push(run[0]);
    if (run.length > 0) {
      const line = run
        .map((i, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(points[i].value as number).toFixed(1)}`)
        .join('');
      linePath += line;
      areaPath += `${line}L${x(run[run.length - 1])},${y(yMin)}L${x(run[0])},${y(yMin)}Z`;
    }
    run = [];
  };
  points.forEach((p, i) => (p.value === null ? flush() : run.push(i)));
  flush();

  return {
    plotWidth,
    x,
    y,
    ticks,
    xLabels,
    linePath,
    areaPath,
    isolated,
    referenceY: reference ? Math.round(y(reference.value)) + 0.5 : null,
  };
}

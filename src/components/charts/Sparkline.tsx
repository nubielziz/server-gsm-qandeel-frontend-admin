// Sparkline: a tiny trend line with no axes, for table cells and stat tiles. Ports spark() of 30-charts.js.
import { colorVar, type ChartColor } from './chartSeries';

export interface SparklineProps {
  /** The trend, oldest first; a null value is a gap (no data). */
  values: readonly (number | null)[];
  color?: ChartColor;
  width?: number;
  height?: number;
  /**
   * Lowest value of the scale. Pass 0 for counts, rates and latencies, so small noise near zero stays a flat line
   * instead of filling the full height. Without it the line spans its own lowest to highest value.
   */
  min?: number;
}

/** Decorative: the figure it sits next to carries the meaning, so the SVG is hidden from assistive tech. */
export function Sparkline({ values, color = 'ink3', width = 56, height = 16, min }: SparklineProps) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return null;
  const low = min === undefined ? Math.min(...known) : Math.min(min, ...known);
  const high = Math.max(...known);
  const last = values.length - 1;
  // A point after a gap starts a new sub-path (M) instead of joining the previous one.
  const path = values
    .map((v, i) => {
      if (v === null) return '';
      const x = (last ? i / last : 0.5) * (width - 2) + 1;
      const y = height - 2 - ((v - low) / (high - low || 1)) * (height - 4);
      const joined = i > 0 && values[i - 1] !== null;
      return `${joined ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join('');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="flex-none"
    >
      <path
        d={path}
        fill="none"
        stroke={colorVar(color)}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

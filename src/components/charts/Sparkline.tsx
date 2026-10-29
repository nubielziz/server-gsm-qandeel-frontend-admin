// Sparkline: a tiny trend line with no axes, for table cells and stat tiles. Ports spark() of 30-charts.js.
import { colorVar, type ChartColor } from './chartSeries';

export interface SparklineProps {
  values: readonly number[];
  color?: ChartColor;
  width?: number;
  height?: number;
}

/** Decorative: the figure it sits next to carries the meaning, so the SVG is hidden from assistive tech. */
export function Sparkline({ values, color = 'ink3', width = 56, height = 16 }: SparklineProps) {
  if (values.length === 0) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const last = values.length - 1;
  const path = values
    .map((v, i) => {
      const x = (last ? i / last : 0.5) * (width - 2) + 1;
      const y = height - 2 - ((v - low) / (high - low || 1)) * (height - 4);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
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

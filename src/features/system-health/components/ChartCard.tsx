// ChartCard: the body of a chart card: a LineChart of one series with the server's threshold, and a "Table view" toggle.
// It goes inside a HealthCard, which owns the loading, error and stale states. No demo screen (design: "Charts").
import { useMemo, useState } from 'react';
import { LineChart } from '@/components/charts';
import { EmptyState } from '@/components/ui';
import { axisFormat, formatValue, niceTop, thresholdOnAxis, thresholdReference, toLinePoints } from '../lib';
import type { Measure, SeriesPoint, TimeRange } from '../types';
import { PointsTable } from './PointsTable';
import { TableViewToggle } from './TableViewToggle';

export interface ChartCardProps {
  /** Oldest first. A null value is a gap in the line, shown as "No data" in the tooltip. */
  points: readonly SeriesPoint[];
  /**
   * Unit, thresholds and direction of the series. The dashed line sits on the same axis as the points, so both must be in
   * this unit (for example `CheckBucket.latencyMs` with the component's latency measure).
   */
  measure: Pick<Measure, 'unit' | 'warn' | 'crit' | 'direction'>;
  range: TimeRange;
  /** Accessible name of the chart ("API p95 latency, last 24 hours"). */
  label: string;
  /** Header of the value column in the table view. */
  valueLabel?: string;
  height?: number;
  /** Fixed top of the axis, for example 100 for a percentage. */
  yMax?: number;
  yMin?: number;
}

/** Gridline intervals of the y axis. */
const TICKS = 3;

/**
 * One series in the first series colour (status hues never mean a series). The threshold is the server's `crit`, or its
 * `warn`; the chart only draws it, and only when the line comes near it: a far-away threshold would stretch the axis and
 * flatten a healthy line, so it is named above the chart instead. Every axis label has one style and the caption names
 * the unit; the tooltip prints the value with its unit. With no known point at all it says "No data".
 */
export function ChartCard({
  points,
  measure,
  range,
  label,
  valueLabel = 'Value',
  height = 180,
  yMax,
  yMin,
}: ChartCardProps) {
  const [table, setTable] = useState(false);
  const { unit, warn, crit, direction } = measure;
  const linePoints = useMemo(() => toLinePoints(points, range), [points, range]);
  const reference = useMemo(
    () => thresholdReference({ unit, warn, crit, direction }),
    [unit, warn, crit, direction],
  );
  const highest = useMemo(
    () => Math.max(...points.flatMap((point) => (point.value === null ? [] : [point.value]))),
    [points],
  );
  const drawn = reference && thresholdOnAxis(reference, highest) ? reference : undefined;
  const top = yMax ?? niceTop(Math.max(highest, drawn?.value ?? -Infinity), TICKS, yMin ?? 0);
  const axis = axisFormat(unit, top);

  if (!points.some((point) => point.value !== null)) {
    return (
      <EmptyState icon="pulse" title="No data">
        This chart shows up once the server has measurements for the range.
      </EmptyState>
    );
  }
  return (
    <div>
      {table ? (
        <PointsTable points={points} unit={unit} caption={label} valueLabel={valueLabel} />
      ) : (
        <>
          <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-2xs text-ink3">
            <p>{axis.caption}</p>
            {reference && !drawn && <p>{reference.label}, above the chart</p>}
          </div>
          <LineChart
            points={linePoints}
            label={label}
            height={height}
            yMax={top}
            yMin={yMin}
            ticks={TICKS}
            formatValue={(value) => formatValue(value, unit)}
            formatAxis={axis.format}
            reference={drawn}
          />
        </>
      )}
      <div className="mt-1 flex justify-end">
        <TableViewToggle pressed={table} onToggle={() => setTable((value) => !value)} />
      </div>
    </div>
  );
}

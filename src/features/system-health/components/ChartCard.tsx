// ChartCard: the body of a chart card: a LineChart of one series with the server's threshold, and a "Table view" toggle.
// It goes inside a HealthCard, which owns the loading, error and stale states. No demo screen (design: "Charts").
import { useMemo, useState } from 'react';
import { LineChart } from '@/components/charts';
import { EmptyState } from '@/components/ui';
import { chartFormat, thresholdReference, toLinePoints, unitCaption } from '../lib';
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

/**
 * One series in the first series colour (status hues never mean a series). The threshold is the server's `crit`, or its
 * `warn`; the chart only draws it. With no known point at all it says "No data" instead of an empty plot.
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
  const { format, suffix } = chartFormat(unit);

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
          <p className="mb-1 text-2xs text-ink3">{unitCaption(unit)}</p>
          <LineChart
            points={linePoints}
            label={label}
            height={height}
            yMax={yMax}
            yMin={yMin}
            formatValue={format}
            unit={suffix}
            reference={reference}
          />
        </>
      )}
      <div className="mt-1 flex justify-end">
        <TableViewToggle pressed={table} onToggle={() => setTable((value) => !value)} />
      </div>
    </div>
  );
}

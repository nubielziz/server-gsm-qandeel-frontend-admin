// LatencyCard: the latency chart of the API tab for the picked surface (or all), with a p50/p95/p99 switch. Draws the
// server's threshold for the chosen percentile.
import { useState } from 'react';
import { SegmentedControl, type SegmentItem } from '@/components/ui';
import { ChartCard, HealthCard, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { RANGE_LABEL } from '../../lib';
import type { ApiMetrics, TimeRange } from '../../types';
import { ChartSkeleton } from './ChartSkeleton';
import { ScopeSub } from './ScopeSub';
import { scopeOf } from './surfaces';

type Percentile = 'p50' | 'p95' | 'p99';

const PERCENTILES: readonly SegmentItem<Percentile>[] = [
  { value: 'p50', label: 'p50' },
  { value: 'p95', label: 'p95' },
  { value: 'p99', label: 'p99' },
];

export interface LatencyCardProps {
  /** The metrics for `surface` (all surfaces when it is undefined). */
  query: HealthQuery<ApiMetrics>;
  range: TimeRange;
  surface: string | undefined;
  /** The surface's name or "All surfaces", for the subtitle and the chart's name. */
  scope: string;
}

/**
 * The percentile is a view choice, so it lives in this component and starts at p95 (the figure the key row shows). The
 * line is the percentile's series; the dashed line is the `warn`/`crit` the server sent for that same percentile.
 */
export function LatencyCard({ query, range, surface, scope }: LatencyCardProps) {
  const [percentile, setPercentile] = useState<Percentile>('p95');
  return (
    <HealthCard
      title="Latency"
      sub={<ScopeSub scope={scope} surface={surface} range={range} />}
      // The switch stays through a load, so the header does not jump when another surface is picked. It goes only when the
      // read failed and there is no chart at all (unavailable, error, forbidden).
      right={
        query.isError && !query.data ? undefined : (
          <SegmentedControl
            items={PERCENTILES}
            value={percentile}
            onChange={setPercentile}
            label="Latency percentile"
          />
        )
      }
      query={query}
      interval={POLL.normal}
      skeleton={<ChartSkeleton />}
      isEmpty={(data) => scopeOf(data, surface) === undefined}
      emptyText="The latency chart appears once the server has measurements for this surface."
      errorTitle="Could not load the latency"
      permission="system:read"
      className="h-full"
    >
      {(data) => {
        const shown = scopeOf(data, surface);
        if (!shown) return null;
        return (
          <ChartCard
            points={shown.series[percentile]}
            measure={shown[percentile]}
            range={range}
            label={`${percentile} latency, ${scope}, ${RANGE_LABEL[range].toLowerCase()}`}
            valueLabel={`${percentile} latency`}
          />
        );
      }}
    </HealthCard>
  );
}

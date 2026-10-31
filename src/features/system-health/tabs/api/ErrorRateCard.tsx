// ErrorRateCard: the 5xx rate chart of the API tab for the picked surface (or all), with the server's threshold line.
import { ChartCard, HealthCard, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { RANGE_LABEL } from '../../lib';
import type { ApiMetrics, TimeRange } from '../../types';
import { ChartSkeleton } from './ChartSkeleton';
import { ScopeSub } from './ScopeSub';
import { scopeOf } from './surfaces';

export interface ErrorRateCardProps {
  /** The metrics for `surface` (all surfaces when it is undefined). */
  query: HealthQuery<ApiMetrics>;
  range: TimeRange;
  surface: string | undefined;
  /** The surface's name or "All surfaces", for the subtitle and the chart's name. */
  scope: string;
}

/** Share of answers that were 5xx, in percent. The dashed line is the `warn`/`crit` limit of `rate5xx` as the server sent it. */
export function ErrorRateCard({ query, range, surface, scope }: ErrorRateCardProps) {
  return (
    <HealthCard
      title="5xx rate"
      sub={<ScopeSub scope={scope} surface={surface} range={range} />}
      query={query}
      interval={POLL.normal}
      skeleton={<ChartSkeleton />}
      isEmpty={(data) => scopeOf(data, surface) === undefined}
      emptyText="The 5xx chart appears once the server has measurements for this surface."
      errorTitle="Could not load the 5xx rate"
      permission="system:read"
      className="h-full"
    >
      {(data) => {
        const shown = scopeOf(data, surface);
        if (!shown) return null;
        return (
          <ChartCard
            points={shown.series.rate5xx}
            measure={shown.rate5xx}
            range={range}
            label={`5xx rate, ${scope}, ${RANGE_LABEL[range].toLowerCase()}`}
            valueLabel="5xx rate"
          />
        );
      }}
    </HealthCard>
  );
}

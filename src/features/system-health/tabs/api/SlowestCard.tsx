// SlowestCard: the ten slowest endpoints of the API tab, for the picked surface (or all), by p95 over the range.
import { SkeletonTable, type DataTableColumn } from '@/components/ui';
import { HealthCard, ResponsiveTable, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { formatValue } from '../../lib';
import type { ApiMetrics, SlowEndpoint, TimeRange } from '../../types';
import { Figure } from './Figure';
import { ScopeSub } from './ScopeSub';

// Method, path and surface are identifiers: mono. The path may be long, so it can break on a narrow screen.
const COLUMNS: DataTableColumn<SlowEndpoint>[] = [
  { key: 'method', label: 'Method', render: (row) => <span className="mono font-medium">{row.method}</span> },
  { key: 'path', label: 'Path', render: (row) => <span className="mono break-all">{row.path}</span> },
  { key: 'surface', label: 'Surface', render: (row) => <span className="mono">{row.surface}</span> },
  { key: 'p95', label: 'p95', num: true, render: (row) => <Figure measure={row.p95} /> },
  {
    key: 'requests',
    label: 'Requests',
    num: true,
    render: (row) => formatValue(row.requestsPerMin, 'per_min'),
  },
];

export interface SlowestCardProps {
  /** The metrics for `surface` (all surfaces when it is undefined). */
  query: HealthQuery<ApiMetrics>;
  range: TimeRange;
  surface: string | undefined;
  scope: string;
}

/**
 * The server ranks the endpoints (slowest first) and the list keeps that order. On a phone the path is the heading of
 * each card, because "GET" alone would say nothing.
 */
export function SlowestCard({ query, range, surface, scope }: SlowestCardProps) {
  return (
    <HealthCard
      title="Slowest endpoints"
      sub={
        <>
          Top 10 by p95 · <ScopeSub scope={scope} surface={surface} range={range} />
        </>
      }
      query={query}
      interval={POLL.normal}
      skeleton={<SkeletonTable cols={5} rows={5} />}
      isEmpty={(data) => data.slowest.length === 0}
      emptyText="Slow endpoints appear here once traffic is measured."
      errorTitle="Could not load the slowest endpoints"
      permission="system:read"
      flush
    >
      {(data) => (
        <ResponsiveTable
          columns={COLUMNS}
          rows={data.slowest}
          rowKey={(row) => `${row.surface} ${row.method} ${row.path}`}
          cardTitle="path"
          caption="Slowest endpoints"
        />
      )}
    </HealthCard>
  );
}

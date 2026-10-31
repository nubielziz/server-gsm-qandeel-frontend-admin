// TopErrorsCard: the most frequent errors of the API tab, for the picked surface (or all): code, endpoint, count, when
// first and last seen, the latest request ID to copy, and a Sentry link when Sentry is configured.
import { useMemo } from 'react';
import { SkeletonTable } from '@/components/ui';
import { num, useNow } from '@/lib/format';
import { HealthCard, ResponsiveTable, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { deepLinkBase } from '../../lib';
import type { ErrorsResponse, TimeRange } from '../../types';
import { errorColumns } from './errorColumns';
import { ScopeSub } from './ScopeSub';

export interface TopErrorsCardProps {
  query: HealthQuery<ErrorsResponse>;
  range: TimeRange;
  surface: string | undefined;
  scope: string;
}

/**
 * The server sends the groups most frequent first and the list keeps that order. The total counts every error of the
 * range, also those in groups beyond the ten shown. "5m ago" moves every half minute.
 */
export function TopErrorsCard({ query, range, surface, scope }: TopErrorsCardProps) {
  const now = useNow(30_000);
  // Read on every render, so the column follows the env (and a test can set it).
  const sentry = deepLinkBase('sentry') !== null;
  const columns = useMemo(() => errorColumns({ now, sentry }), [now, sentry]);
  const total = query.data?.total;
  return (
    <HealthCard
      title="Top errors"
      sub={
        <>
          {typeof total === 'number' && `${num(total)} ${total === 1 ? 'error' : 'errors'} · `}
          <ScopeSub scope={scope} surface={surface} range={range} />
        </>
      }
      query={query}
      interval={POLL.normal}
      skeleton={<SkeletonTable cols={6} rows={5} />}
      isEmpty={(data) => data.groups.length === 0}
      emptyText="Errors with the same code on the same endpoint are grouped here. None were reported in this range."
      errorTitle="Could not load the top errors"
      permission="system:read"
      flush
    >
      {(data) => (
        <ResponsiveTable
          columns={columns}
          rows={data.groups}
          rowKey={(group) => `${group.code} ${group.status} ${group.method} ${group.endpoint}`}
          caption="Most frequent errors"
        />
      )}
    </HealthCard>
  );
}

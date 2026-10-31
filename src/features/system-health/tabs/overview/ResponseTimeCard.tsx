// ResponseTimeCard: the second card of the Overview tab: the response time of the picked component over the range, as a
// line with the server's threshold. It reads `GET /admin/system/checks?component=` on route group `health`.
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui';
import { ChartCard, HealthBadge, HealthCard, type HealthQuery } from '../../components';
import { POLL, useChecks, useHealthRange, useSystemHealth } from '../../hooks';
import { RANGE_LABEL, formatDuration } from '../../lib';
import type { ChecksResponse, SystemHealth } from '../../types';
import { latencyPoints, type ResolvedComponent } from './componentRows';

/** The chart's first-load shape: one grey block the height of the plot. */
function ChartSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <Skeleton height={180} />
    </div>
  );
}

/**
 * Before the summary has answered there may be no component to ask about (nothing picked in the address, and the default
 * needs the summary). The card then waits on the summary's own state: its skeleton, its error and Retry.
 */
function waitingOn(health: HealthQuery<SystemHealth>): HealthQuery<ChecksResponse> {
  return {
    data: undefined,
    error: health.error,
    isPending: health.isPending,
    isError: health.isError,
    isFetching: health.isFetching,
    dataUpdatedAt: 0,
    refetch: health.refetch,
  };
}

interface BodyProps {
  data: ChecksResponse;
  componentKey: string;
  /** The answer is the previous range's, kept on screen while the new one loads: draw it dimmed, as the bars are. */
  dimmed: boolean;
}

/** The chart for one component of the answer. The card has already checked that the answer holds it. */
function ResponseTimeBody({ data, componentKey, dimmed }: BodyProps) {
  const entry = data.components.find((candidate) => candidate.key === componentKey);
  const points = useMemo(() => latencyPoints(entry?.buckets ?? []), [entry]);
  if (!entry) return null;
  return (
    <div className={dimmed ? 'opacity-60' : undefined} aria-busy={dimmed || undefined}>
      <ChartCard
        points={points}
        measure={entry.latency}
        range={data.range}
        label={`${entry.name} response time, ${RANGE_LABEL[data.range].toLowerCase()}`}
        valueLabel="p95 response time"
      />
    </div>
  );
}

export interface ResponseTimeCardProps {
  /** The component to chart, from the address or the default (`usePickedComponent`). */
  picked: ResolvedComponent;
}

/**
 * The title names the component and the range. When the component is not fine, a badge beside it says how it stands (the
 * server's status): a component that is down can draw a flat line well under its threshold, and the chart alone would look
 * healthy. A fine component has no badge: its row in the list says so, and a healthy platform stays quiet (and nothing is
 * green while monitoring is down). The line is the p95 of each check bucket in milliseconds, with the warn or crit line the
 * server sent for that component. Another range keeps the old line on screen, dimmed, until the new one is there; another
 * component shows the skeleton.
 */
export function ResponseTimeCard({ picked }: ResponseTimeCardProps) {
  const { key, unknownAsked } = picked;
  const health = useSystemHealth();
  const [range] = useHealthRange();
  const checks = useChecks({ range, component: key ?? undefined }, key !== null);

  const listed = health.data?.components.find((component) => component.key === key);
  const name =
    listed?.name ?? checks.data?.components.find((component) => component.key === key)?.name ?? key;
  const seconds = checks.data?.bucketSeconds;
  const bucket =
    seconds !== undefined && Number.isFinite(seconds) && seconds > 0 ? formatDuration(seconds) : null;
  const title = name
    ? `Response time · ${name} · ${RANGE_LABEL[range].toLowerCase()}`
    : `Response time · ${RANGE_LABEL[range].toLowerCase()}`;

  return (
    <HealthCard
      title={title}
      sub={
        <>
          p95 of the checks in each {bucket ? `${bucket} ` : ''}bucket.
          {unknownAsked && name && (
            <>
              {' '}
              <span className="mono">{unknownAsked}</span> is not a known component, so this shows {name}.
            </>
          )}
        </>
      }
      right={listed && listed.status !== 'ok' ? <HealthBadge status={listed.status} /> : undefined}
      query={key === null ? waitingOn(health) : checks}
      interval={POLL.normal}
      permission="system:read"
      errorTitle="Could not load the response time"
      emptyText="The response time shows up once the component has been checked."
      isEmpty={(data) => !data.components.some((component) => component.key === key)}
      skeleton={<ChartSkeleton />}
    >
      {(data) =>
        key === null ? null : (
          <ResponseTimeBody data={data} componentKey={key} dimmed={checks.isPlaceholderData} />
        )
      }
    </HealthCard>
  );
}

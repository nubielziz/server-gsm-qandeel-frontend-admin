// HealthCard: a Panel around one health query. Every card of every tab uses it, so loading, refreshing, empty,
// unavailable, error, stale and forbidden look and behave the same. No demo screen (docs/system-health-design.md, "States").
import type { ReactNode } from 'react';
import { Button, EmptyState, ErrorState, Icon, Panel, errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { isMonitoringUnavailable } from '../hooks/monitoring';
import { isForbiddenError } from '../lib';
import { CardSkeleton } from './CardSkeleton';
import { StaleBadge } from './StaleBadge';

/** The part of React Query's result a card reads. A real `UseQueryResult` fits, and so does a plain object in a test. */
export interface HealthQuery<T> {
  data: T | undefined;
  error: unknown;
  /** No answer yet (the first load). */
  isPending: boolean;
  /** The last fetch failed. `data` can still hold the last good answer. */
  isError: boolean;
  /** A fetch is running (first load, poll or manual refresh). */
  isFetching: boolean;
  /** When `data` was fetched, epoch milliseconds. 0 when there is no answer yet. */
  dataUpdatedAt: number;
  refetch: () => unknown;
}

export interface HealthCardProps<T> {
  title: ReactNode;
  /** Muted line under the title. */
  sub?: ReactNode;
  /** Header controls (buttons, a switch). The stale badge sits before them. */
  right?: ReactNode;
  query: HealthQuery<T>;
  /** Poll interval in milliseconds (`POLL.fast`…). The data is "Stale" after two of them. 0 for a card that does not poll. */
  interval: number;
  /** First-load placeholder in the shape of the content. Default: a few grey lines. */
  skeleton?: ReactNode;
  /** True when the answer holds nothing to show (a 200 with an empty list). */
  isEmpty?: (data: T) => boolean;
  /** What the card would show, for the empty state ("Slow endpoints appear here once traffic is measured."). */
  emptyText?: string;
  /** Names what failed ("Could not load the queues"). */
  errorTitle?: string;
  /** The permission the card reads with, named in the forbidden state ("alerts:read"). */
  permission?: string;
  /** The staff member lacks the permission (a client hint, usually with the query disabled). A 403 from the server counts too. */
  forbidden?: boolean;
  /** No inner padding, for tables that run edge to edge. */
  flush?: boolean;
  id?: string;
  /** Grid placement, for example `xl:col-span-6`. */
  className?: string;
  /** Renders the content. Called only when there is data. */
  children: (data: T) => ReactNode;
}

const UNAVAILABLE_TEXT =
  'The monitoring system did not answer. Nothing here counts as healthy until it does.';

/**
 * States in order: forbidden, first load (skeleton), failed without data (unavailable or error), empty, content. A refresh
 * keeps the content on screen. If a refresh fails or the data is older than two intervals, the content stays and a "Stale"
 * badge with Retry joins the header. Content is never shown green on no data: an answer without data is neutral.
 */
export function HealthCard<T>({
  title,
  sub,
  right,
  query,
  interval,
  skeleton,
  isEmpty,
  emptyText,
  errorTitle,
  permission,
  forbidden = false,
  flush,
  id,
  className,
  children,
}: HealthCardProps<T>) {
  const { data } = query;
  const error = query.isError ? query.error : null;
  const retry = () => void query.refetch();
  const denied = forbidden || isForbiddenError(error);

  let state: 'forbidden' | 'loading' | 'unavailable' | 'error' | 'empty' | 'ready';
  let body: ReactNode;
  if (denied) {
    state = 'forbidden';
    body = (
      <EmptyState
        icon="lock"
        title={permission ? `You need the ${permission} permission` : 'You do not have access to this'}
      >
        {(isApiError(error) && error.detail) || 'Ask an administrator to add it to your role.'}
      </EmptyState>
    );
  } else if (data === undefined && error === null && query.isPending) {
    state = 'loading';
    body = skeleton ?? <CardSkeleton />;
  } else if (data === undefined && error !== null) {
    if (isMonitoringUnavailable(error)) {
      state = 'unavailable';
      body = (
        <EmptyState
          icon="pulse"
          title="Monitoring unavailable"
          cta={
            <Button onClick={retry}>
              <Icon name="refresh" className="ic-sm" />
              Retry
            </Button>
          }
        >
          {(isApiError(error) && error.detail) || UNAVAILABLE_TEXT}
        </EmptyState>
      );
    } else {
      state = 'error';
      body = <ErrorState title={errorTitle ?? 'Could not load this card'} error={error} onRetry={retry} />;
    }
  } else if (data === undefined || isEmpty?.(data)) {
    state = 'empty';
    body = <EmptyState title="No data">{emptyText ?? 'There is nothing to show here yet.'}</EmptyState>;
  } else {
    state = 'ready';
    body = children(data);
  }

  // The badge belongs to data that is on screen; a card with no data has its own state block.
  const stale =
    data !== undefined && !denied ? (
      <StaleBadge
        updatedAt={query.dataUpdatedAt}
        interval={interval}
        failed={error !== null}
        reason={error === null ? undefined : `The last refresh failed: ${errorText(error)}`}
        fetching={query.isFetching}
        onRetry={retry}
      />
    ) : null;
  const header =
    stale || right ? (
      <div className="flex flex-wrap items-center gap-2">
        {stale}
        {right}
      </div>
    ) : undefined;

  return (
    <Panel id={id} title={title} sub={sub} right={header} flush={flush} className={className}>
      <div data-state={state}>{body}</div>
    </Panel>
  );
}

// HistoryNotice: one quiet line above the components list when the check history could not be read (or could not be
// refreshed). The rows stay; the notice carries the server's words, the request id and Retry.
import { Button, Icon } from '@/components/ui';
import type { ApiError } from '@/lib/api';
import { failureOf } from '../../header/failure';
import { isMonitoringUnavailable } from '../../hooks';

/** The part of React Query's result the notice reads. */
export interface HistoryNoticeProps {
  query: {
    isError: boolean;
    error: ApiError | null;
    /** The last good answer, when there is one: the notice then says the history is out of date. */
    data: unknown;
    isFetching: boolean;
    refetch: () => unknown;
  };
}

/**
 * Neutral on purpose: a history that cannot be read is "no data", not an alarm of its own. Nothing shows while the read
 * works.
 */
export function HistoryNotice({ query }: HistoryNoticeProps) {
  if (!query.isError) return null;
  const failure = failureOf(query.error);
  const lead = isMonitoringUnavailable(query.error)
    ? 'Monitoring unavailable.'
    : query.data
      ? 'The check history is out of date.'
      : 'The check history could not be loaded.';
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3.5 py-2 text-xs text-ink2"
    >
      <span className="inline-flex min-w-0 items-start gap-1.5">
        <Icon name="info" className="ic-sm mt-px flex-none text-ink3" />
        <span>
          <span className="font-medium">{lead}</span> {failure.detail ?? failure.title}
        </span>
      </span>
      {failure.requestId && (
        <span className="text-ink3">
          Request <span className="mono">{failure.requestId}</span>
        </span>
      )}
      <Button size="sm" variant="ghost" onClick={() => void query.refetch()} loading={query.isFetching}>
        Retry
      </Button>
    </div>
  );
}

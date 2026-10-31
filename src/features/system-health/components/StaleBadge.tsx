// StaleBadge: "Stale · updated 2m ago" with a Retry button, in the header of a HealthCard whose data is old or whose last
// refresh failed. It owns its clock so the card's body does not re-render every few seconds.
import { Badge, Button } from '@/components/ui';
import { useNow } from '@/lib/format';
import { formatAgo, isStale } from '../lib';

export interface StaleBadgeProps {
  /** `dataUpdatedAt` of the query: when the data on screen was fetched. */
  updatedAt: number | undefined;
  /** Poll interval in milliseconds; 0 for a card that does not poll. */
  interval: number;
  /** The last refresh failed, so the data is stale however young it is. */
  failed: boolean;
  /** Why the last refresh failed (the server's words), shown as the badge's tooltip. */
  reason?: string;
  /** A refresh is running: Retry shows a spinner. */
  fetching: boolean;
  onRetry: () => void;
}

/** Renders nothing while the data is fresh. The data underneath stays: it is the last good answer, now labelled. */
export function StaleBadge({ updatedAt, interval, failed, reason, fetching, onRetry }: StaleBadgeProps) {
  const now = useNow(5000);
  if (!failed && !isStale(updatedAt, now, interval)) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span title={reason}>
        <Badge tone="warn" icon="clock">
          Stale{updatedAt ? ` · updated ${formatAgo(now - updatedAt)}` : ''}
        </Badge>
      </span>
      <Button size="sm" variant="ghost" onClick={onRetry} loading={fetching}>
        Retry
      </Button>
    </span>
  );
}

// Freshness: "Updated 8s ago" that ticks every second, with a Stale badge after two poll intervals. No demo screen.
import { Badge, cx } from '@/components/ui';
import { fmtDate, useNow } from '@/lib/format';
import { formatAgo, formatInterval, isStale } from '../lib';

export interface FreshnessProps {
  /** When the data was last fetched, in epoch milliseconds (`dataUpdatedAt` of the query). 0 or missing: never. */
  updatedAt: number | undefined;
  /** Poll interval in milliseconds. The data is stale after two of them. 0 means no polling. */
  interval: number;
  /** Adds "refreshes every 15s". */
  showInterval?: boolean;
  /** The clock, for tests and for pages that share one. Default: a clock that ticks every second. */
  now?: number;
  className?: string;
}

/** The age of the data the page shows. Stale is a word and an icon, not just a colour. */
export function Freshness({ updatedAt, interval, showInterval = false, now, className }: FreshnessProps) {
  const tick = useNow(1000);
  const current = now ?? tick;
  const stale = isStale(updatedAt, current, interval);
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink3', className)}>
      {updatedAt ? (
        <span className="tabular-nums" title={fmtDate(updatedAt)}>
          Updated {formatAgo(current - updatedAt)}
        </span>
      ) : (
        <span>Not updated yet</span>
      )}
      {showInterval && interval > 0 && <span>· refreshes every {formatInterval(interval)}</span>}
      {stale && (
        <Badge tone="warn" icon="clock">
          Stale
        </Badge>
      )}
    </span>
  );
}

// The check history behind the uptime bars of the Overview tab, shaped for the rows of the components list: one lookup
// by component key and the state of the read (`GET /admin/system/checks`, route group `health`).
import type { CheckBucket, ChecksResponse, TimeRange } from '../../types';

/** What the bars cell needs from the history read. */
export interface HistoryView {
  /** `loading`: no answer yet. `failed`: the read failed and there is no answer to show. `ready`: there are buckets. */
  status: 'loading' | 'failed' | 'ready';
  /** Check buckets by component key, oldest first. */
  buckets: ReadonlyMap<string, readonly CheckBucket[]>;
  bucketSeconds?: number;
  /** The range the buckets are for. It lags behind the page's range while a new one loads. */
  range?: TimeRange;
  /** The buckets are the previous range's, kept on screen while the new one loads: draw them dimmed. */
  placeholder: boolean;
}

const NONE: ReadonlyMap<string, readonly CheckBucket[]> = new Map();

/** The pieces of React Query's result this reads, so a test can pass a plain object. */
export interface HistoryQuery {
  data: ChecksResponse | undefined;
  isError: boolean;
  isPlaceholderData: boolean;
}

/** A failed refresh with an older answer still on screen stays `ready`: the old bars are better than none. */
export function historyView({ data, isError, isPlaceholderData }: HistoryQuery): HistoryView {
  if (!data) return { status: isError ? 'failed' : 'loading', buckets: NONE, placeholder: false };
  return {
    status: 'ready',
    buckets: new Map(data.components.map((entry) => [entry.key, entry.buckets])),
    bucketSeconds: data.bucketSeconds,
    range: data.range,
    placeholder: isPlaceholderData,
  };
}

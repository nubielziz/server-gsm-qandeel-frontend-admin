// One of the support chat's own stream events, parsed. The layer's `useStreamEvent` gives events it does not know as `unknown`; this checks the frame with its
// parser first, so a handler only ever sees a value of the documented shape (a bad frame is skipped).
import { useStreamEvent } from '@/lib/realtime';
import type { StreamEventMeta } from '@/lib/realtime';

/** Calls `handler` for each `name` frame that `parse` accepts. The latest `handler` is always used. `meta.relayed` is true when another tab holds the stream. */
export function useLiveEvent<T>(
  name: string,
  parse: (data: unknown) => T | null,
  handler: (data: T, meta: StreamEventMeta) => void,
): void {
  useStreamEvent(name, (data, meta) => {
    const parsed = parse(data);
    if (parsed !== null) handler(parsed, meta);
  });
}

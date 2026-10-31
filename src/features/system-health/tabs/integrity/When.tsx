// When: a time as "31 Oct, 10:34 · 44m ago" for the Integrity tab (last run, last success, last entry of a finding).
// Part of the Integrity tab (route group health). No demo screen.
import type { TimeInput } from '@/lib/format';
import { NONE, whenParts } from './format';

export interface WhenProps {
  /** The moment to show. A missing or unreadable one prints a dash. */
  at: TimeInput | null | undefined;
  /** The clock "ago" counts from, so one screen shows one moment. */
  now: number;
}

/**
 * The date and the "ago" part are two pieces that never break inside. A narrow cell then wraps between them and the dot
 * goes with "ago", instead of hanging at the end of the first line ("31 Oct, 10:34 ·").
 */
export function When({ at, now }: WhenProps) {
  const when = whenParts(at, now);
  if (!when) return <>{NONE}</>;
  return (
    <>
      <span className="whitespace-nowrap">{when.date}</span>
      {when.ago && (
        <>
          {' '}
          <span className="whitespace-nowrap">· {when.ago}</span>
        </>
      )}
    </>
  );
}

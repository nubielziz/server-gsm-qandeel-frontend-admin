// "14:05 · 38m ago" in two parts: a time the server sent, as the clock or date plus how long ago. The Overview tab uses it
// for "since", "started" and "deployed" (route group `health`).
import { ago, dayKey, fmtDate, fmtTime } from '@/lib/format';

/** The two halves of the text, so the age can be drawn in the muted ink. */
export interface WhenParts {
  /** "14:05" for today, "22 Oct, 08:14" for an earlier day. */
  when: string;
  /** "just now", "38m ago", "3h ago", "9d ago". */
  ago: string;
}

/**
 * Null when the server sent no time, or one that cannot be read, so the caller prints its own "No data" and a bad value
 * never shows as "Invalid Date".
 */
export function whenParts(time: string | null | undefined, now: number): WhenParts | null {
  const ms = time ? Date.parse(time) : Number.NaN;
  if (Number.isNaN(ms)) return null;
  return { when: dayKey(ms) === dayKey(now) ? fmtTime(ms) : fmtDate(ms), ago: ago(ms, now) };
}

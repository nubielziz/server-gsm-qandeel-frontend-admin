// The schedule dialog's time: the native `datetime-local` value (local time, no zone) to the ISO string the API takes, the earliest and latest
// time the dialog offers, and the staff member's time zone to show beside it. The server checks the bounds again (1 minute to 90 days).

const MINUTE_MS = 60_000;

/** The earliest time the dialog offers: two minutes from now (the server accepts one, the sweep runs every minute). */
export const MIN_AHEAD_MINUTES = 2;
/** The farthest time the server accepts. */
export const MAX_AHEAD_DAYS = 90;

const pad = (value: number) => String(value).padStart(2, '0');

/** A moment as the value of a `datetime-local` input, in the browser's time zone: "2026-11-14T08:00". */
export function toLocalInputValue(time: number | Date): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The `min` of the input: now plus two minutes. */
export function minLocalValue(now: number): string {
  return toLocalInputValue(now + MIN_AHEAD_MINUTES * MINUTE_MS);
}

/** The `max` of the input: 90 days from now. */
export function maxLocalValue(now: number): string {
  return toLocalInputValue(now + MAX_AHEAD_DAYS * 24 * 60 * MINUTE_MS);
}

/** The input's value as the ISO string the API takes (`new Date(value).toISOString()`), or null for an empty or unreadable value. */
export function toScheduledAt(value: string): string | null {
  if (value.trim() === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** A hint when the chosen time is empty, too soon or too far; undefined when it is acceptable. */
export function scheduleHint(value: string, now: number): string | undefined {
  const at = toScheduledAt(value);
  if (at === null) return 'Choose a date and time.';
  const ahead = Date.parse(at) - now;
  if (ahead < MIN_AHEAD_MINUTES * MINUTE_MS)
    return `Choose a time at least ${MIN_AHEAD_MINUTES} minutes from now.`;
  if (ahead > MAX_AHEAD_DAYS * 24 * 60 * MINUTE_MS)
    return `Choose a time at most ${MAX_AHEAD_DAYS} days from now.`;
  return undefined;
}

/** The staff member's time zone as "Asia/Amman (UTC+03:00)", so the time they typed is not mistaken for UTC. */
export function timeZoneLabel(at: Date = new Date()): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  const offset = -at.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${zone} (UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)})`;
}

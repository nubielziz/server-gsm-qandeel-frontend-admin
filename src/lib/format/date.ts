// Date and time display, ported from the demo's 00-util.js (fmtDate, fmtDay, fmtTime, dayKey, ago, dur).
// Output matches the demo: en-GB parts in the browser's time zone, and short relative text such as "5m ago".

/** A moment as an epoch in milliseconds, an ISO string from the API, or a Date. */
export type TimeInput = number | string | Date;

/** Epoch milliseconds, or NaN for an empty or unreadable value. */
function toMs(time: TimeInput | null | undefined): number {
  if (time === null || time === undefined || time === '') return Number.NaN;
  if (typeof time === 'number') return time;
  return time instanceof Date ? time.getTime() : Date.parse(time);
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const weekdayDayMonth = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

// Each helper returns '' for a missing or invalid time, so a bad value shows nothing instead of crashing the page.
// Callers pick their own placeholder, e.g. `fmtDate(me.lastLoginAt) || 'Never'`.

/** "05 Mar, 14:07". */
export function fmtDate(time: TimeInput | null | undefined): string {
  const ms = toMs(time);
  return Number.isNaN(ms) ? '' : `${dayMonth.format(ms)}, ${clock.format(ms)}`;
}

/** "Thu, 05 Mar". */
export function fmtDay(time: TimeInput | null | undefined): string {
  const ms = toMs(time);
  return Number.isNaN(ms) ? '' : weekdayDayMonth.format(ms);
}

/** "14:07". */
export function fmtTime(time: TimeInput | null | undefined): string {
  const ms = toMs(time);
  return Number.isNaN(ms) ? '' : clock.format(ms);
}

/** A sortable number for the local calendar day: 20260305. Groups rows by day. */
export function dayKey(time: TimeInput): number {
  const d = new Date(toMs(time));
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** "just now", "5m ago", "3h ago", "2d ago". Pass `now` (from `useNow`) to keep a screen consistent and testable. */
export function ago(time: TimeInput | null | undefined, now: number = Date.now()): string {
  const ms = toMs(time);
  if (Number.isNaN(ms)) return '';
  const seconds = Math.max(0, (now - ms) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

/** A duration in milliseconds as "420 ms", "3.2 s", "12 min", "1.5 h", "2 d" (non-breaking spaces). */
export function dur(ms: number): string {
  const nbsp = ' '; // "1 d" must never split across lines
  if (ms < 1000) return `${Math.round(ms)}${nbsp}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}${nbsp}s`;
  if (s < 3600) return `${Math.round(s / 60)}${nbsp}min`;
  if (s < 86400) return `${(s / 3600).toFixed(1).replace(/\.0$/, '')}${nbsp}h`;
  return `${(s / 86400).toFixed(1).replace(/\.0$/, '')}${nbsp}d`;
}

/**
 * "<1m", "45m", "2h 5m", "3d 4h": a duration in its two largest units, with non-breaking spaces (the demo's
 * `ageText`, used for SLA ages, time left on a rule, the oldest order in a queue).
 */
export function ageText(ms: number): string {
  // A date the server sent in a shape we cannot read must not print "NaNd".
  if (!Number.isFinite(ms)) return '';
  const nbsp = '\u00a0';
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${minutes % 60 ? `${nbsp}${minutes % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? `${nbsp}${hours % 24}h` : ''}`;
}

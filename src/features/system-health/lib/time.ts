// "Updated 8s ago", "since 14:02 (38m)" and "31 Oct, 14:02" texts, the date-time input conversions and the stale rule of
// the System health cards. No demo screen (docs/system-health-design.md,
// "Refresh and freshness"). The clock itself comes from `useNow` of @/lib/format.
import { ageText, dayKey, fmtDate, fmtTime } from '@/lib/format';
import { formatDuration } from './measure';

/** How long ago something happened, with seconds: "just now", "8s ago", "2m ago", "3h ago", "2d ago". */
export function formatAgo(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (seconds < 3) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * True when an answer is older than two poll intervals ("Stale"). Without a time (never answered) or without polling
 * (`interval` 0) nothing counts as stale by age; a failed refetch is the caller's second reason for "Stale".
 */
export function isStale(updatedAt: number | undefined, now: number, interval: number): boolean {
  if (!updatedAt || interval <= 0) return false;
  return now - updatedAt > 2 * interval;
}

/** The poll interval in words for the header: 15000 -> "15s", 60000 -> "1m". */
export function formatInterval(intervalMs: number): string {
  return formatDuration(intervalMs / 1000);
}

/**
 * "since 14:02 (38m)", or with the date when it began on an earlier day: "since 22 Oct, 08:14 (9d)". Null when the server
 * sent no time, or one that cannot be read.
 */
export function sinceText(since: string | null | undefined, now: number): string | null {
  const start = since ? Date.parse(since) : Number.NaN;
  if (Number.isNaN(start)) return null;
  const when = dayKey(start) === dayKey(now) ? fmtTime(start) : fmtDate(start);
  return `since ${when} (${ageText(now - start)})`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** An ISO time as the value of a `datetime-local` input, in the browser's time zone ("2026-10-31T16:30"). Empty if unreadable. */
export function toLocalInput(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The value of a `datetime-local` input (the browser's time zone) as an ISO time for the API. Null when empty. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** "14:02" for today, "31 Oct, 14:02" for another day; empty when there is no time. For "since" and "expected end". */
export function whenText(iso: string | null | undefined, now: number = Date.now()): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) return '';
  return dayKey(ms) === dayKey(now) ? fmtTime(ms) : fmtDate(ms);
}

// Groups the entries by day, with the heading of each day ("Today", "Yesterday", "Thu, 05 Mar"). Ports dayLabel of
// 47-p-audit.js and the `day` heading logic of its list.
import { dayKey, fmtDay } from '@/lib/format';
import type { AuditLog } from '../types';

const DAY_MS = 86_400_000;

const startOfDay = (ms: number): number => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** "Today", "Yesterday" or the weekday and date, by the browser's calendar. `now` is a parameter so a test can fix it. */
export function dayLabel(time: string | number, now: number = Date.now()): string {
  const ms = typeof time === 'number' ? time : Date.parse(time);
  if (Number.isNaN(ms)) return '';
  const gap = Math.round((startOfDay(now) - startOfDay(ms)) / DAY_MS);
  if (gap === 0) return 'Today';
  if (gap === 1) return 'Yesterday';
  return fmtDay(ms);
}

/** A run of entries from the same day. */
export type DayGroup = { key: number; label: string; rows: AuditLog[] };

/**
 * Splits the list (newest first) into days. A day whose entries are split by a "Show more" page break stays one group,
 * because the rows are grouped after all loaded pages are joined.
 */
export function groupByDay(rows: readonly AuditLog[], now: number = Date.now()): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    const last = groups.at(-1);
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, label: dayLabel(row.createdAt, now), rows: [row] });
  }
  return groups;
}

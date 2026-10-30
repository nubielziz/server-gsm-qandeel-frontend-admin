// Time constants, UTC calendar-day helpers and small sums for the dashboard mock. The mock buckets charts by UTC day and month.
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** Midnight (UTC) at the start of the day that holds `ms`. */
export const dayStart = (ms: number): number => Math.floor(ms / DAY) * DAY;

/** "2026-10-30": the calendar day of a day start. */
export const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The start of each of the last `count` UTC days including today, oldest first. */
export function lastDays(now: number, count: number): number[] {
  const today = dayStart(now);
  return Array.from({ length: count }, (_, index) => today - (count - 1 - index) * DAY);
}

/** "2026-10" for each of the last `count` UTC months including this one, oldest first. */
export function lastMonths(now: number, count: number): string[] {
  const current = new Date(now);
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - (count - 1 - index), 1),
    );
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** Sum of `pick(item)` over the items. */
export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

/** The middle value of a list of numbers (the upper middle for an even count, as the demo does), or null for an empty list. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

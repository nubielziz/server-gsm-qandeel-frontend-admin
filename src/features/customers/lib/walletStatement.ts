// The statement's date range: two calendar days typed in the date boxes, sent as UTC times (`createdAt_gte` and `createdAt_lte`).
// The server filters; this only writes the question.
import type { ListQuery } from '@/lib/api';

/** Two days as `YYYY-MM-DD` (what a date box holds); an empty text means that end is open. */
export type DateRange = { from: string; to: string };

export const NO_RANGE: DateRange = { from: '', to: '' };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True when the text is a day the date box can hold. */
export function isDay(text: string): boolean {
  return DAY.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00.000Z`));
}

/** The filters of a range: the first moment of `from` and the last moment of `to`, in UTC. A bad or empty day is left out. */
export function rangeFilters(range: DateRange): NonNullable<ListQuery['filters']> {
  return {
    createdAt_gte: isDay(range.from) ? `${range.from}T00:00:00.000Z` : undefined,
    createdAt_lte: isDay(range.to) ? `${range.to}T23:59:59.999Z` : undefined,
  };
}

/** Whether the range is backwards (the end before the start), a mistake worth a hint before asking the server. */
export function isBackwards(range: DateRange): boolean {
  return isDay(range.from) && isDay(range.to) && range.to < range.from;
}

/** Whether any end of the range is set. */
export function hasRange(range: DateRange): boolean {
  return range.from !== '' || range.to !== '';
}

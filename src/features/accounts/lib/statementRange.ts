// The date range of the statement as the two filters the server reads (`createdAt_gte`, `createdAt_lte`). The page turns the days
// staff pick into ISO times (UTC day start and end) and this only maps them onto the query.
import type { StatementRange } from '../types';

/** The statement's range as list filters; an end that was left out is left out of the query. */
export function rangeFilters(range: StatementRange): { createdAt_gte?: string; createdAt_lte?: string } {
  return {
    ...(range.from ? { createdAt_gte: range.from } : {}),
    ...(range.to ? { createdAt_lte: range.to } : {}),
  };
}

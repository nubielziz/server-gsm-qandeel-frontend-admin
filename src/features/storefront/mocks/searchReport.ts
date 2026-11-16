// The Search report's mock figures: a 30-day report with 12 terms and 4 searches that found nothing, scaled for 7 and 90 days.
// Terms and counts only, as the server sends them: no visitor, no address. The mock plays the server and keeps no real log.
import type { ReportDays, SearchReport } from '../types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// [term, searches, visitors, zeroResults] over 30 days.
const TOP: readonly (readonly [string, number, number, number])[] = [
  ['iphone 15 unlock', 412, 188, 0],
  ['icloud', 361, 205, 12],
  ['frp', 298, 160, 0],
  ['samsung unlock', 254, 140, 6],
  ['imei check', 233, 171, 0],
  ['vodafone uk', 187, 120, 0],
  ['o2 uk unlock', 164, 98, 0],
  ['sim unlock', 141, 90, 0],
  ['xiaomi mi account', 96, 61, 41],
  ['blacklist check', 88, 70, 0],
  ['mi account remove', 71, 49, 71],
  ['huawei id', 54, 38, 22],
];

// [term, searches, hours since it was last searched] over 30 days.
const ZERO: readonly (readonly [string, number, number])[] = [
  ['mi account remove', 71, 2],
  ['bootloader unlock', 33, 26],
  ['tmobile premium', 19, 70],
  ['apple watch', 12, 118],
];

/** A count over `days` days from its 30-day figure; a figure above zero stays above zero. */
function scaled(count: number, days: number): number {
  return count === 0 ? 0 : Math.max(1, Math.round((count * days) / 30));
}

/** The report for 7, 30 or 90 days, with times relative to now. */
export function reportFor(days: ReportDays, now: number = Date.now()): SearchReport {
  const top = TOP.map(([term, searches, visitors, zeroResults]) => ({
    term,
    searches: scaled(searches, days),
    visitors: scaled(visitors, days),
    zeroResults: scaled(zeroResults, days),
  }));
  const zero = ZERO.filter(([, , hours]) => hours * HOUR <= days * DAY).map(([term, searches, hours]) => ({
    term,
    searches: scaled(searches, days),
    lastSeen: new Date(now - hours * HOUR).toISOString(),
  }));
  // Searches that found nothing, counted once per term: a term's own figure, or all its searches when it is listed below.
  const nothing = new Map<string, number>();
  for (const row of top) if (row.zeroResults > 0) nothing.set(row.term, row.zeroResults);
  for (const row of zero) nothing.set(row.term, row.searches);
  return {
    days,
    totals: {
      searches: scaled(2840, days),
      zeroResults: [...nothing.values()].reduce((sum, count) => sum + count, 0),
      terms: scaled(214, days),
    },
    topTerms: top,
    zeroResultTerms: zero,
  };
}

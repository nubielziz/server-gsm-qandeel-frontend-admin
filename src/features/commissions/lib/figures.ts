// The four cells of the header strip. Ports `comStrip` in 46-p-commissions.js. The demo added up its in-memory accruals; the console
// adds no money in the browser (the server owns sums), so the strip shows only what the server counts (`x-total-count`) and a dash
// where the demo showed an amount or a share, until the backend offers a summary (MISMATCHES M154).
import type { StatCell } from '@/components/ui';
import { num } from '@/lib/format';

const DAY_MS = 86_400_000;

/** The window the strip looks back over (the demo's `30 * DAY`). */
export const STRIP_DAYS = 30;

/**
 * The start of the 30 days as the API filter `createdAt_gte` wants it. It is rounded down to a whole day, so the query key
 * stays the same all day and the count is not asked again on every render.
 */
export function windowStart(now: number): string {
  return new Date(Math.floor(now / DAY_MS) * DAY_MS - STRIP_DAYS * DAY_MS).toISOString();
}

/** What the strip knows: counts from the server. A count is undefined until the server has answered. */
export type StripCounts = {
  /** Accruals waiting for approval. */
  ready: number | undefined;
  /** Approved accruals earned in the last 30 days. */
  approved30: number | undefined;
};

const accruals = (count: number | undefined) =>
  count === undefined ? undefined : `${num(count)} ${count === 1 ? 'accrual' : 'accruals'}`;

/**
 * The strip's four cells in the demo's order and words. The amounts and the share are dashes (no sum is worked out in the
 * browser); the counts come from the server.
 */
export function stripCells(counts: StripCounts): StatCell[] {
  const ready = accruals(counts.ready);
  const approved = accruals(counts.approved30);
  return [
    { label: 'Ready to approve', value: '–', sub: ready },
    { label: 'Approved, 30 days', value: '–', sub: approved && `${approved} paid into wallets` },
    { label: 'Earned, 30 days', value: '–', sub: 'Approved plus waiting' },
    {
      label: 'Share of revenue',
      value: '–',
      sub: 'Commission as % of the referred merchants’ 30-day order revenue',
    },
  ];
}

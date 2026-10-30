// The four figures above the tabs. Ports `refundStrip` of 53-p-refunds.js. The counts come from list totals, the money from
// the payments report's totals, so the console adds no money: it only formats what the server sent. A figure whose source the
// staff member may not read is left out.
import type { StatCell } from '@/components/ui';
import { ageText, money0, pct } from '@/lib/format';
import type { Dispute, PaymentsTotals } from '../types';
import { isUrgent, msLeft } from './deadline';
import { disputeLabel } from './labels';

/** What the strip is built from. A value is undefined while its call has not answered (or failed). */
export type RefundFigures = {
  requested?: number;
  failed?: number;
  needsResponse?: number;
  underReview?: number;
  /** The open dispute whose evidence is due first, or null when none needs evidence. */
  nextDue?: Pick<Dispute, 'id' | 'evidenceDueAt'> | null;
  totals?: PaymentsTotals;
};

const NONE = '–';

const REFUNDED_TIP =
  'Money sent back to customers. The VAT part comes back out of what you owe the tax office.';
const LOSS_TIP =
  'When a customer disputes a card payment and the bank sides with them, the money and a dispute fee are taken back. Keep the evidence pack ready for every order.';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function refundedCell(totals: PaymentsTotals | undefined): StatCell {
  return {
    label: 'Refunded, 30 days',
    value: totals ? money0(totals.refundedAmount) : NONE,
    sub: totals
      ? `${plural(totals.refundedCount, 'refund')} · ${pct(totals.refundedPercentOfSales)} of sales`
      : undefined,
    tip: REFUNDED_TIP,
  };
}

function waitingCell(f: RefundFigures): StatCell {
  const known = f.requested !== undefined && f.failed !== undefined;
  const waiting = known ? (f.requested ?? 0) + (f.failed ?? 0) : undefined;
  const parts = [f.totals ? money0(f.totals.awaitingAmount) : null, `${f.failed ?? 0} failed at the gateway`];
  return {
    label: 'Waiting for you',
    value: waiting ?? NONE,
    className: waiting ? 'text-warn-fg' : undefined,
    sub:
      waiting === undefined
        ? undefined
        : waiting > 0
          ? parts.filter(Boolean).join(' · ')
          : 'No requests open',
  };
}

function disputesCell(f: RefundFigures, now: number): StatCell {
  const known = f.needsResponse !== undefined && f.underReview !== undefined;
  const open = known ? (f.needsResponse ?? 0) + (f.underReview ?? 0) : undefined;
  const due = f.nextDue;
  const left = due ? msLeft(due.evidenceDueAt, now) : null;
  let sub: string | undefined;
  if (due && left !== null) {
    sub =
      left > 0
        ? `Evidence for ${disputeLabel(due.id)} due in ${ageText(left)}`
        : `Evidence for ${disputeLabel(due.id)} was due ${ageText(-left)} ago`;
  } else if (open !== undefined) {
    sub = open > 0 ? 'With the card network' : 'None open';
  }
  return {
    label: 'Card disputes open',
    value: open ?? NONE,
    className: due && isUrgent(due.evidenceDueAt, now) ? 'text-crit-fg' : undefined,
    sub,
  };
}

function lossCell(totals: PaymentsTotals | undefined): StatCell {
  return {
    label: 'Lost to chargebacks',
    value: totals ? money0(totals.chargebackLoss) : NONE,
    sub: 'All time, with the dispute fees',
    tip: LOSS_TIP,
  };
}

/**
 * The cells the staff member can fill, in the demo's order. `can` answers a permission: refunds need `refunds:read`,
 * disputes `disputes:read` and the money figures `reports:finance`.
 */
export function stripCells(f: RefundFigures, now: number, can: (permission: string) => boolean): StatCell[] {
  const cells: StatCell[] = [];
  if (can('reports:finance')) cells.push(refundedCell(f.totals));
  if (can('refunds:read')) cells.push(waitingCell(f));
  if (can('disputes:read')) cells.push(disputesCell(f, now));
  if (can('reports:finance')) cells.push(lossCell(f.totals));
  return cells;
}

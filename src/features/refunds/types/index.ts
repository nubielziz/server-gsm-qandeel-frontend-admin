// Types for the refunds feature (`/refunds`): refunds, card disputes and the storefront payments report, with the bodies of
// their actions. The map gives the tables but no bodies (MISMATCHES M10), so every shape below is an assumed contract, built
// from the generated rows in `src/lib/api/schema.gen.ts` and narrowed to what the screens use.
import type { NamedRef } from '@/features/orders';
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
import type { DisputeRow, PaymentRow, RefundRow } from '@/lib/api/schema.gen';

// ---- Payments ----

/** How a storefront customer paid (the demo's `B2C_METHODS`): card, Apple / Google Pay, or crypto. */
export type PaymentMethod = 'card' | 'wallet' | 'crypto';

/** What happened to a payment since it was captured (the demo's `PAY_STATUS`). */
export type PaymentStatus = 'captured' | 'refunded' | 'partial_refund' | 'disputed' | 'chargeback';

// ---- Refunds ----

/** Where a refund is: waiting for a person, done, failed at the gateway, or declined. */
export type RefundStatus = 'requested' | 'completed' | 'failed' | 'rejected';

/** `original` goes back to the same payment method; `manual` is paid out by hand (a crypto payment the gateway cannot reverse). */
export type RefundMethod = 'original' | 'manual';

/** Who opened a refund: the customer, a staff member, or the system (a failed unlock is refunded by itself). */
export type RefundRequester = { type: 'customer' | 'staff' | 'system'; name: string | null };

/** The order a refund is for: what the approve dialog says about delivery and the supplier cost. */
export type RefundOrder = {
  id: Id;
  /** When the result reached the customer; null while it has not. */
  deliveredAt: IsoDateTime | null;
  /** What the supplier was paid for it. A delivered order does not get this back. */
  cost: Money;
};

/** The payment being refunded. */
export type RefundPayment = {
  id: Id;
  method: PaymentMethod;
  /** Card brand and last digits, or the coin and network. */
  brand: string;
  /** What the customer paid, VAT included (USD). */
  amount: Money;
  /** The VAT inside it. The server returns it in proportion to the amount refunded. */
  taxAmount: Money;
};

/**
 * One refund, as `GET /admin/refunds` and `GET /admin/refunds/:id` send it (assumed contract). Names and the order and
 * payment summaries are included so a row and the approve dialog need no second request. Amounts are USD; the customer's
 * own currency and the rate the order was priced with are there for display only.
 */
export type Refund = Pick<RefundRow, 'id' | 'orderId' | 'amount' | 'reason' | 'completedAt' | 'createdAt'> & {
  status: RefundStatus;
  method: RefundMethod;
  /** The customer's currency (an ISO code such as `GBP`). */
  currency: string;
  /** The rate the order was priced with, to show `amount` in `currency`. */
  fx: Decimal;
  /** True when less than the whole payment goes back. */
  partial: boolean;
  gatewayRefundId: string | null;
  /** A failure from the gateway, or the message the customer got when the request was declined. */
  note: string | null;
  requestedBy: RefundRequester;
  /** The staff member who decided it, once someone has. */
  approvedBy: NamedRef | null;
  customer: NamedRef | null;
  order: RefundOrder;
  payment: RefundPayment;
  /** The part that came out of revenue, as the server worked it out; null until the refund is completed. */
  netAmount: Money | null;
  /** The part that came out of VAT payable, as the server worked it out; null until the refund is completed. */
  taxAmount: Money | null;
};

/** Body of `POST /admin/refunds/:id/approve` (assumed contract). Without `amount` the amount on the request is refunded. */
export type ApproveRefundBody = { amount?: Money };

/** Body of `POST /admin/refunds/:id/decline` (assumed contract): the message the customer gets. */
export type DeclineRefundBody = { reason: string };

// ---- Disputes ----

/** `needs_response` waits for our proof; `under_review` is with the card network; `won` and `lost` are final. */
export type DisputeStatus = 'needs_response' | 'under_review' | 'won' | 'lost';

/** How good the case looks, as the server weighs the pack. */
export type EvidenceStrength = 'strong' | 'fair' | 'weak';

/**
 * One line of the evidence pack (assumed contract): payment record, 3-D Secure, proof of delivery, the terms the
 * customer accepted, order history, customer contact. `ok` says whether it supports our case. `key` is what a
 * submission sends back to say the line is part of the pack.
 */
export type EvidenceItem = { key: string; title: string; body: string; ok: boolean };

/**
 * One card dispute, as `GET /admin/disputes` and `GET /admin/disputes/:id` send it (assumed contract). Only the single
 * read carries the evidence pack and its strength; the list leaves them out.
 */
export type Dispute = Pick<
  DisputeRow,
  | 'id'
  | 'orderId'
  | 'amount'
  | 'fee'
  | 'reasonCode'
  | 'evidenceDueAt'
  | 'submittedAt'
  | 'resolvedAt'
  | 'createdAt'
> & {
  status: DisputeStatus;
  currency: string;
  fx: Decimal;
  /** What the bank or the customer said, in a sentence. */
  note: string | null;
  customer: NamedRef | null;
  strength?: EvidenceStrength | null;
  evidence?: EvidenceItem[];
};

/** Body of `POST /admin/disputes/:id/evidence` (assumed contract): the pack lines to send and an optional note to the card network. */
export type SubmitEvidenceBody = { items: string[]; note?: string };

// ---- Payments report ----

/** One storefront payment in the report's table. */
export type PaymentLine = Pick<PaymentRow, 'id' | 'orderId' | 'amount' | 'feeAmount' | 'createdAt'> & {
  method: PaymentMethod;
  brand: string;
  status: PaymentStatus;
  currency: string;
  fx: Decimal;
  customer: NamedRef | null;
};

/** One row of "By payment method": what a way of paying costs and how often it ends in a refund or a dispute. */
export type PaymentMethodSummary = {
  method: PaymentMethod;
  payments: number;
  volume: Money;
  fees: Money;
  /** Fees as a percent of the volume (the server works it out). */
  feeRate: Decimal;
  refunds: number;
  disputes: number;
};

/** Figures for the page's strip, summed by the server (the console adds no money). */
export type PaymentsTotals = {
  /** Refunds completed in the last 30 days: how many, how much, and the percent of those days' storefront sales. */
  refundedCount: number;
  refundedAmount: Money;
  refundedPercentOfSales: Decimal;
  /** Refunds waiting for a person (requested or failed at the gateway). */
  awaitingAmount: Money;
  /** All-time chargeback losses, dispute fees included. */
  chargebackLoss: Money;
};

/**
 * Answer of `GET /admin/reports/payments` (assumed contract): the comparison of every method (always whole), one page of
 * the payments (filtered by `method`, newest first unless sorted), how many payments match, and the strip's totals.
 */
export type PaymentsReport = {
  methods: PaymentMethodSummary[];
  payments: PaymentLine[];
  total: number;
  totals: PaymentsTotals;
};

/** What the report is asked: a method filter, a row range and a sort (the same words as a list). */
export type PaymentsReportQuery = {
  method?: PaymentMethod;
  start?: number;
  end?: number;
  sort?: string;
  order?: 'asc' | 'desc';
};

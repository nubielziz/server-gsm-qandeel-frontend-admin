// Types for the payments routes (`/admin/payments*`): a deposit (a merchant's wallet top-up) and the bodies of its
// review. Ports the demo's `S.payments` rows (10-data.js). The map gives no bodies (MISMATCHES M10), so every shape is an
// assumed contract, built from `PaymentRow` in `src/lib/api/schema.gen.ts`.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { PaymentRow } from '@/lib/api/schema.gen';

/** Why the money came: a merchant topping up the wallet (the Deposits tab) or a storefront customer paying an order. */
export type PaymentPurpose = 'topup' | 'order';

/** Where a deposit is in review. Card deposits are credited when paid, so they arrive already `approved`. */
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

/** How the merchant paid (`methodType`). The console names these four; any other word is shown as it is. */
export type PaymentMethod = 'bank' | 'card' | 'usdt' | 'wise';

/** The merchant who paid. `walletBalance` is what the wallet holds now, when the server sends it. */
export type PaymentClient = {
  id: Id;
  name: string;
  /** The merchant's group name (Standard, Wholesale, VIP). */
  group: string | null;
  walletBalance: Money | null;
};

/** The gateway or manual channel the money came through. */
export type PaymentGateway = { id: Id; name: string };

/** The staff member who approved or rejected a deposit. */
export type PaymentReviewer = { id: Id | null; name: string };

/**
 * One deposit, as `GET /admin/payments` and `GET /admin/payments/:id` send it (assumed contract). `amount` is what the
 * merchant paid, `feeAmount` the fee taken from it and `netAmount` what the wallet is credited: the server works the
 * three out, the console only shows them. `note` is a hint to the reviewer while pending (a large amount) and the
 * reason once the deposit is rejected.
 */
export type Payment = Pick<
  PaymentRow,
  'id' | 'amount' | 'feeAmount' | 'currency' | 'gatewayTxnId' | 'capturedAt' | 'createdAt'
> & {
  purpose: PaymentPurpose;
  status: PaymentStatus;
  methodType: PaymentMethod;
  netAmount: Money;
  invoiceId: Id | null;
  /** The uploaded proof of payment, a file the `files:read` permission can download. */
  receiptFileId: Id | null;
  client: PaymentClient | null;
  gateway: PaymentGateway | null;
  reviewedBy: PaymentReviewer | null;
  reviewedAt: IsoDateTime | null;
  note: string | null;
};

/** The filters `GET /admin/payments` understands besides paging and sorting (assumed contract). */
export type PaymentFilters = {
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
  clientId?: Id;
};

/** Body of `POST /admin/payments/:id/reject` (assumed contract): the reason the merchant is shown. */
export type RejectPaymentBody = { reason: string };

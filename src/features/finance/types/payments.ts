// Types for the payments routes (`/admin/payments*`): a deposit (the top-up of an account's wallet: a merchant wallet, or a store
// balance) and the bodies of its review. Ports the demo's `S.payments` rows (10-data.js). The map gives no bodies (MISMATCHES M10), so every shape is an
// assumed contract, built from `PaymentRow` in `src/lib/api/schema.gen.ts`.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { PaymentRow } from '@/lib/api/schema.gen';

/** Why the money came: an account topping up its wallet (the Deposits tab) or a shop buyer paying an order. */
export type PaymentPurpose = 'topup' | 'order';

/** Where a deposit is in review. Card deposits are credited when paid, so they arrive already `approved`. */
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

/** How the account paid (`methodType`). The console names these four; any other word is shown as it is. */
export type PaymentMethod = 'bank' | 'card' | 'usdt' | 'wise';

/** The account whose merchant wallet the top-up fills (`id` is the account id). `walletBalance` is what the wallet holds now, when the server sends it. */
export type PaymentClient = {
  id: Id;
  name: string;
  /** The merchant's group name (Standard, Wholesale, VIP). */
  group: string | null;
  walletBalance: Money | null;
};

/**
 * The account whose store balance the top-up fills (`id` is the account id); `client` is null for such a row. `walletBalance` is
 * what the balance holds now, null while the account has no wallet.
 */
export type PaymentCustomer = { id: Id; name: string; email: string; walletBalance: Money | null };

/** Where a top-up's chargeback stands: waiting for evidence, with the card network, won or lost. */
export type PaymentDisputeStatus = 'needs_response' | 'under_review' | 'won' | 'lost';

/**
 * The newest chargeback of a top-up (either wallet kind). A top-up dispute shows here and never in the
 * Disputes tab: `created` puts a store balance on hold, `lost` takes the credit back (the balance may go below zero),
 * `won` changes nothing and staff lift the hold. `amount` and `fee` are in the payment currency.
 */
export type PaymentDispute = {
  id: Id;
  status: PaymentDisputeStatus;
  reasonCode: string;
  amount: Money;
  fee: Money;
  evidenceDueAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  /** The chargeback journal of a lost dispute; null otherwise. */
  transactionId: Id | null;
};

/** The gateway or manual channel the money came through. */
export type PaymentGateway = { id: Id; name: string };

/** The staff member who approved or rejected a deposit. */
export type PaymentReviewer = { id: Id | null; name: string };

/**
 * One deposit, as `GET /admin/payments` and `GET /admin/payments/:id` send it (assumed contract). `amount` is what the
 * account paid, `feeAmount` the fee taken from it and `netAmount` what the wallet is credited: the server works the
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
  /** Set for the top-up of a store balance, null for a merchant deposit. */
  customer: PaymentCustomer | null;
  /** The newest chargeback of this top-up, or null. */
  dispute: PaymentDispute | null;
  gateway: PaymentGateway | null;
  reviewedBy: PaymentReviewer | null;
  reviewedAt: IsoDateTime | null;
  note: string | null;
};

/**
 * Whose top-up, by the kind of wallet it fills: a merchant wallet or a store balance. The words are the wire's
 * (`owner=merchant|customer`); the screen says "Merchant wallet" and "Store balance".
 */
export type PaymentOwner = 'merchant' | 'customer';

/**
 * The filters `GET /admin/payments` understands besides paging, sorting and `q` (assumed contract). The buyer filter is
 * `accountId`; `clientId` is only an alias of it (a merchant's id is its account id), and `customerId` is not sent at all: the
 * server answers it with 422.
 */
export type PaymentFilters = {
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
  /** One account's top-ups, of either wallet kind. */
  accountId?: Id;
  /** Alias of `accountId`. */
  clientId?: Id;
  /** Merchant wallet top-ups only, or store balance top-ups only. */
  owner?: PaymentOwner;
};

/** Body of `POST /admin/payments/:id/reject` (assumed contract): the reason the account holder is shown. */
export type RejectPaymentBody = { reason: string };

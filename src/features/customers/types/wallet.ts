// Types for a customer's store balance (`/admin/customers/:id/wallet*`, feature 21). The shapes follow the backend's
// `customer-wallet.contracts.ts` (routes beyond the map, so they are assumed contracts: MISMATCHES through HANDOFF.md).
import type { Id, IsoDateTime, Money } from '@/lib/api';

/** Why and since when the balance cannot be spent. The reason is for staff only; the customer never sees it. */
export type WalletHold = { at: IsoDateTime; reason: string };

/** Top-ups the customer started and has not finished: how many, and the net they would add. */
export type PendingTopUps = { count: number; amount: Money };

/**
 * The store balance of one customer as staff see it (`GET /admin/customers/:id/wallet`). Everything is USD. `reserved` and
 * `creditLimit` are always zero for a customer (the merchant wallet's shape). `available` is zero while the balance is on
 * hold, switched off or negative. `enabled` is the shop's master switch, not a property of this customer.
 */
export type CustomerWallet = {
  enabled: boolean;
  currency: string;
  balance: Money;
  reserved: Money;
  creditLimit: Money;
  available: Money;
  frozen: WalletHold | null;
  pendingTopUps: PendingTopUps;
  /** Open disputes of this customer's top-ups. */
  openDisputes: number;
  /** An adjustment above this needs a second approver (setting `wallet.customer.adjust_approval_limit`). */
  adjustApprovalLimit: Money;
};

/**
 * One line of the customer's statement (the same row the merchant's statement has): a ledger entry on the balance, signed
 * from the customer's side, with the running balance the server kept. Staff see the full memo, reasons included.
 */
export type WalletStatementRow = {
  /** The ledger entry. */
  id: Id;
  /** The journal the entry belongs to; the journal dialog opens it. */
  transactionId: Id;
  kind: string;
  memo: string;
  amount: Money;
  balanceAfter: Money;
  createdAt: IsoDateTime;
};

/** Which way an adjustment moves the balance. */
export type WalletDirection = 'credit' | 'debit';

/** Body of `POST /admin/customers/:id/wallet/adjust`: a positive amount, a direction and a reason of 5 to 140 characters. */
export type AdjustWalletBody = { amount: Money; direction: WalletDirection; reason: string };

/** Answer of the adjustment: the journal the server posted and the balance afterwards. */
export type AdjustWalletResult = { transactionId: Id; wallet: CustomerWallet };

/** Body of freeze and unfreeze: a reason of 5 to 200 characters. */
export type FreezeWalletBody = { reason: string };

/** The date range of the statement; both ends are ISO times and either may be left out. */
export type WalletStatementRange = { from?: IsoDateTime; to?: IsoDateTime };

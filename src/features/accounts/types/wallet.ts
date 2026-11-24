// Types of the wallet routes of an account (`/admin/clients/:id/wallet`, `/statement`, `/wallet/adjust`, `/credit-limit`,
// `/wallet/freeze`, `/wallet/unfreeze`): one address for both kinds, chosen by the rank. The map gives no bodies
// (MISMATCHES M10), so every shape below is an assumed contract.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { WalletKind } from './account';

/** Why and since when the wallet cannot be spent. The reason is for staff only. */
export type WalletHold = { at: IsoDateTime; reason: string };

/** Top-ups started and not finished: how many, and the net they would add. */
export type PendingTopUps = { count: number; amount: Money };

/**
 * The live wallet of one account as staff see it (`GET .../wallet` and every wallet write). Everything is USD and worked out by
 * the server. A merchant wallet has `reserved` (held for open orders) and a `creditLimit` (how far below zero it may go); a
 * store balance has both at zero, never allows credit and goes below zero only through a chargeback. `available` is zero while
 * a store balance is on hold, switched off or negative. `enabled` is the shop's master switch for store balances.
 */
export type AccountWallet = {
  kind: WalletKind;
  currency: string;
  balance: Money;
  reserved: Money;
  creditLimit: Money;
  available: Money;
  /** True when the rank allows a credit limit. */
  creditAllowed: boolean;
  /** An adjustment above this needs a second approver. */
  adjustApprovalLimit: Money;
  frozen: WalletHold | null;
  enabled: boolean;
  pendingTopUps: PendingTopUps;
  /** Open disputes of this account's card top-ups. */
  openDisputes: number;
};

/**
 * One line of an account's statement: a ledger entry on the live wallet, signed from the account's side (a deposit is
 * positive, an order hold negative), with the running balance the server kept. `orderId` names the order the line is about.
 */
export type StatementRow = {
  /** The ledger entry. */
  id: Id;
  /** The journal the entry belongs to; the journal dialog opens it. */
  transactionId: Id;
  kind: string;
  memo: string;
  amount: Money;
  balanceAfter: Money;
  createdAt: IsoDateTime;
  orderId?: Id | null;
};

/** Which way an adjustment moves the wallet. */
export type AdjustDirection = 'credit' | 'debit';

/** Body of `POST /admin/clients/:id/wallet/adjust`: a positive amount, a direction and a reason. */
export type AdjustWalletBody = { amount: Money; direction: AdjustDirection; reason: string };

/** Answer of the adjustment: the journal the server posted and the wallet afterwards. */
export type AdjustWalletResult = { transactionId: Id; wallet: AccountWallet };

/** Body of `PATCH /admin/clients/:id/credit-limit`. Zero removes the credit. */
export type CreditLimitBody = { creditLimit: Money };

/** Body of freeze and unfreeze: a reason of 5 to 200 characters. */
export type WalletReasonBody = { reason: string };

/** The date range of the statement; both ends are ISO times and either may be left out. */
export type StatementRange = { from?: IsoDateTime; to?: IsoDateTime };

/**
 * Which wallet a statement reads: the live one (the default), or the history of a wallet the account left behind by a rank change
 * (`wallet=merchant` or `wallet=store` on `GET /admin/clients/:id/statement`).
 */
export type StatementWallet = 'live' | 'merchant' | 'store';

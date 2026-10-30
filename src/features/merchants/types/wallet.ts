// Types for a merchant's wallet routes (`/admin/clients/:id/wallet`, `/statement`, `/wallet/adjust`, `/credit-limit`). The map
// gives no bodies (MISMATCHES M10), so every shape below is an assumed contract built on the generated ledger rows.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { ClientWallet } from './client';

/**
 * One line of a merchant's statement (assumed contract): a ledger entry on the merchant's wallet account. `amount` is
 * signed from the merchant's side, so a deposit is positive and an order hold negative. `balanceAfter` is the running
 * balance the server kept with the entry.
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
};

/** Which way an adjustment moves the wallet. */
export type AdjustDirection = 'credit' | 'debit';

/** Body of `POST /admin/clients/:id/wallet/adjust` (assumed contract): a positive amount, a direction and a reason. */
export type AdjustWalletBody = { amount: Money; direction: AdjustDirection; reason: string };

/** Answer of the adjustment (assumed contract): the journal the server posted and the wallet afterwards. */
export type AdjustWalletResult = { transactionId: Id; wallet: ClientWallet };

/** Body of `PATCH /admin/clients/:id/credit-limit` (assumed contract). Zero removes the credit. */
export type CreditLimitBody = { creditLimit: Money };

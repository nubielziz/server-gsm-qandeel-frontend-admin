// Types for the ledger account routes (`GET /admin/ledger/accounts`, `POST /admin/ledger/reconcile`): the trial balance
// and the result of a reconciliation. Ports the demo's accounts tab (accountsTab in 45-p-finance.js). The map gives no
// bodies (MISMATCHES M10), so every shape is an assumed contract, built from `LedgerAccountRow`.
import type { Id, IsoDateTime, Money } from '@/lib/api';

/**
 * One line of the trial balance: all the accounts of one kind added up (a wallet account exists for every merchant, so
 * `client_wallet` is one line). `balance` is signed like the ledger lines: positive is a debit, negative a credit.
 */
export type TrialBalanceRow = {
  kind: string;
  balance: Money;
  /** How many ledger accounts of this kind there are. */
  accounts: number;
};

/**
 * The trial balance (assumed contract). The server adds up the lines: `totalDebit` and `totalCredit` are equal when the
 * books balance, and the console shows them next to each other rather than working them out.
 */
export type TrialBalance = {
  currency: string;
  rows: TrialBalanceRow[];
  totalDebit: Money;
  totalCredit: Money;
};

/** An account whose stored balance is not what its entries add up to. `difference` is `stored` minus `expected`. */
export type ReconcileDifference = {
  accountId: Id;
  kind: string;
  /** The merchant or supplier that owns the account, if any. */
  ownerName: string | null;
  stored: Money;
  expected: Money;
  difference: Money;
};

/** What a reconciliation found (assumed contract): an empty `differences` list means every account matched. */
export type ReconcileResult = {
  ranAt: IsoDateTime;
  accountsChecked: number;
  entriesChecked: number;
  differences: ReconcileDifference[];
};

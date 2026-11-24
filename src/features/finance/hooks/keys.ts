// Query keys of the finance reads that are not Refine resources (decision 005: they start with `['api', 'finance']`), and
// what a decision on a deposit makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { ACCOUNT_WALLET_KEY, DASHBOARD_KEY, type InvalidateTarget } from '@/lib/query';
import type { Payment } from '../types';

/** The Pending / Approved / Rejected / All counts of the Deposits tab, and the header's "waiting" figure. */
export const PAYMENT_COUNTS_KEY = ['api', 'finance', 'payment-counts'] as const;

/** The trial balance (the tab and the header's Bank and Supplier prepaid figures). */
export const TRIAL_BALANCE_KEY = ['api', 'finance', 'trial-balance'] as const;

/** The three reports (the header's wallet figures read the wallet exposure one). */
export const REPORT_KEY = ['api', 'finance', 'reports'] as const;

/** The store balances list, and what an approved store balance top-up makes stale besides it. */
export const STORE_BALANCES_KEY = ['api', 'finance', 'store-balances'] as const;

/**
 * The statement rows of each account's wallet, which the accounts feature reads (`['api', 'accounts', 'statement']`): finance cannot
 * import its keys, so the prefix is written out here and kept in step with `STATEMENT_KEY` there. The wallet figures themselves
 * (both kinds) are `ACCOUNT_WALLET_KEY` of `@/lib/query`, shared by both features.
 */
export const ACCOUNT_STATEMENT_KEY = ['api', 'accounts', 'statement'] as const;

/** The payments listed on each account's record (same note as above; `PAYMENTS_KEY` there). */
export const ACCOUNT_PAYMENTS_KEY = ['api', 'accounts', 'payments'] as const;

/** The ledger entries posted for each deposit (its "View ledger entries" dialog). */
export const PAYMENT_ENTRIES_KEY = ['api', 'finance', 'payment-entries'] as const;

/** Merchant-rank account names for the issue-invoice dialog. */
export const MERCHANT_LOOKUP_KEY = ['api', 'finance', 'lookups', 'merchants'] as const;

/** How often the deposit queue, the counts and the header ask again while the page is open. */
export const REFRESH_MS = 30_000;

/** What any decision on a deposit makes stale besides Refine's own lists: the counts and the sidebar's pending count. */
export const DEPOSIT_STALE_KEYS: QueryKey[] = [PAYMENT_COUNTS_KEY, DASHBOARD_KEY];

/** An approval also moves money: the balances, the wallet figures and the reports built on them change. */
export const APPROVE_STALE_KEYS: QueryKey[] = [
  ...DEPOSIT_STALE_KEYS,
  TRIAL_BALANCE_KEY,
  REPORT_KEY,
  PAYMENT_ENTRIES_KEY,
  // The credit lands on the account's live wallet, of either kind: its figures, its statement, its payments and the store balances list change.
  ACCOUNT_WALLET_KEY,
  ACCOUNT_STATEMENT_KEY,
  ACCOUNT_PAYMENTS_KEY,
  STORE_BALANCES_KEY,
];

/**
 * The Refine targets of a decided deposit: its lists and record, plus the ledger entries and the invoices an approval
 * posts or settles (a rejection changes neither, but a refresh of two lists is cheap).
 */
export function staleDeposit(payment: Pick<Payment, 'id' | 'client' | 'customer'>): InvalidateTarget[] {
  return [
    { resource: 'payments', id: payment.id },
    { resource: 'ledger/transactions' },
    { resource: 'invoices' },
    // The account's record carries its wallet figures, which an approval changes (a merchant wallet's and a store balance's alike).
    { resource: 'clients', id: payment.client?.id ?? payment.customer?.id },
  ];
}

// Query keys of the finance reads that are not Refine resources (decision 005: they start with `['api', 'finance']`), and
// what a decision on a deposit makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY, type InvalidateTarget, MERCHANT_WALLET_KEY } from '@/lib/query';
import type { Payment } from '../types';

/** The Pending / Approved / Rejected / All counts of the Deposits tab, and the header's "waiting" figure. */
export const PAYMENT_COUNTS_KEY = ['api', 'finance', 'payment-counts'] as const;

/** The trial balance (the tab and the header's Bank and Supplier prepaid figures). */
export const TRIAL_BALANCE_KEY = ['api', 'finance', 'trial-balance'] as const;

/** The three reports (the header's wallet figures read the wallet exposure one). */
export const REPORT_KEY = ['api', 'finance', 'reports'] as const;

/** The customer wallets list (feature 21), and what an approved customer top-up makes stale besides it. */
export const CUSTOMER_WALLETS_KEY = ['api', 'finance', 'customer-wallets'] as const;

/**
 * The customers feature's balance reads (`['api', 'customers', 'wallet']`): finance cannot import them, so the prefix is written
 * out here and kept in step with `CUSTOMER_WALLET_KEY` there.
 */
export const CUSTOMER_BALANCE_KEY = ['api', 'customers', 'wallet'] as const;

/** The statement rows of each customer's balance (same note as above). */
export const CUSTOMER_BALANCE_STATEMENT_KEY = ['api', 'customers', 'wallet-statement'] as const;

/** The ledger entries posted for each deposit (its "View ledger entries" dialog). */
export const PAYMENT_ENTRIES_KEY = ['api', 'finance', 'payment-entries'] as const;

/** Merchant names for the issue-invoice dialog. */
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
  MERCHANT_WALLET_KEY,
  // A customer's top-up credits their store balance (feature 21): the wallet figures, statement and list change.
  CUSTOMER_WALLETS_KEY,
  CUSTOMER_BALANCE_KEY,
  CUSTOMER_BALANCE_STATEMENT_KEY,
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
    // The merchant's record carries its wallet figures, which an approval changes.
    { resource: 'clients', id: payment.client?.id },
    // A customer's top-up credits their balance; their record lists the customer's counts.
    ...(payment.customer ? [{ resource: 'customers', id: payment.customer.id }] : []),
  ];
}

// Ledger account routes (`GET /admin/ledger/accounts`, `POST /admin/ledger/reconcile`): the trial balance and the
// reconciliation. Ports the demo's accounts tab (accountsTab in 45-p-finance.js); the map gives no bodies (MISMATCHES M10).
import { apiGet, apiPost, type ApiInit } from '@/lib/api';
import type { ReconcileResult, TrialBalance } from '../types';

/**
 * The trial balance: every account kind with its balance, and the debit and credit totals. The demo worked these out
 * in the browser from its in-memory ledger; the console asks the server, which owns the balances, and shows them.
 * Assumed contract: one line per account kind (the balances of all accounts of that kind added up), signed like the
 * ledger lines (positive is a debit).
 * @route GET /admin/ledger/accounts
 */
export function getTrialBalance(init?: ApiInit): Promise<TrialBalance> {
  return apiGet<TrialBalance>('/admin/ledger/accounts', undefined, init);
}

/**
 * Runs the reconciliation now: the server compares every account's stored balance with the sum of its entries and
 * answers what it found. It replaces the demo's integrity checks, which the browser worked out itself.
 * Assumed contract: the answer lists the accounts that differ; an empty list means all of them matched.
 * @route POST /admin/ledger/reconcile
 */
export function reconcileLedger(init?: ApiInit): Promise<ReconcileResult> {
  return apiPost<ReconcileResult>('/admin/ledger/reconcile', undefined, init);
}

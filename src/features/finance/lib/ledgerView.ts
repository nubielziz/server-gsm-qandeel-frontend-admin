// The Ledger tab's search, type filter, account filter and sort as address parameters, and how they become API filters.
// Ports `ledgerRows` and the `ui.finance` state of 45-p-finance.js: the demo filtered an in-memory array, the console asks
// the server (MISMATCHES M126). Nothing here decides which entries match; it only writes and reads the question.
import type { SortState } from '@/components/ui';
import { LEDGER_KIND_LABEL } from './kinds';
import type { ListFilters } from './refineFilters';
import { withParams } from './url';

/** The search text, one entry kind and one account kind (`bank`). Empty means "no filter". */
export type LedgerFilters = { q: string; kind: string; account: string };

/** The columns the server sorts the ledger by: Time, Journal and Type. */
export const LEDGER_SORT_FIELDS = ['createdAt', 'id', 'kind'] as const;

/** Newest entry first, as the demo's ledger. */
export const LEDGER_DEFAULT_SORT: SortState = { field: 'createdAt', order: 'desc' };

const ACCOUNT_KIND = /^[a-z][a-z0-9_]*$/;

/** Reads the filters from the address; an unknown type or a malformed account is dropped. */
export function parseLedgerFilters(params: URLSearchParams): LedgerFilters {
  const kind = params.get('kind') ?? '';
  const account = params.get('account') ?? '';
  return {
    q: params.get('q') ?? '',
    kind: Object.hasOwn(LEDGER_KIND_LABEL, kind) ? kind : '',
    account: ACCOUNT_KIND.test(account) ? account : '',
  };
}

/** The address with some filters changed. Empty filters leave no trace; everything else is kept as it is. */
export function writeLedgerFilters(base: URLSearchParams, patch: Partial<LedgerFilters>): URLSearchParams {
  const merged = { ...parseLedgerFilters(base), ...patch };
  return withParams(base, { q: merged.q, kind: merged.kind, account: merged.account });
}

/** Whether any filter is on: the demo's `on`, which shows "Clear filters" and the "No entries match" empty state. */
export function hasLedgerFilters(filters: LedgerFilters): boolean {
  return Boolean(filters.q.trim() || filters.kind || filters.account);
}

/** The address with the three filters and the page removed (the demo's `fin-clear`). */
export function clearLedgerFilters(base: URLSearchParams): URLSearchParams {
  return withParams(base, { q: undefined, kind: undefined, account: undefined, page: undefined });
}

/**
 * People type "JRN-00025" or "#25"; the API's id is the number, so the prefix and the zeros are dropped. Any other text
 * is sent as it is, trimmed.
 */
export function normalizeLedgerSearch(text: string): string {
  const trimmed = text.trim();
  const id = /^(?:#|jrn-)\s*0*(\d+)$/i.exec(trimmed);
  return id ? id[1] : trimmed;
}

/** The API filters for the toolbar. */
export function toLedgerListFilters(filters: LedgerFilters): ListFilters {
  const q = normalizeLedgerSearch(filters.q);
  return {
    ...(q ? { q } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.account ? { accountKind: filters.account } : {}),
  };
}

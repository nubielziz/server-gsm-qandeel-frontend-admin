// The Store balances tab's search, state filter, page and sort as address parameters, and how they become the list call (feature 21).
// Nothing here decides which wallets match; it only writes and reads the question.
import type { SortState } from '@/components/ui';
import type { CustomerWalletState } from '../types';
import { withParams } from './url';

export const WALLET_STATES: readonly { id: CustomerWalletState; label: string }[] = [
  { id: 'positive', label: 'With balance' },
  { id: 'zero', label: 'Empty' },
  { id: 'negative', label: 'Below zero' },
  { id: 'frozen', label: 'On hold' },
];

/** Search text and one state. Empty means "no filter". */
export type WalletListState = { q: string; state: CustomerWalletState | '' };

/** The columns the server sorts wallets by: Balance and Updated. */
export const WALLET_SORT_FIELDS = ['balance', 'updatedAt'] as const;

export const WALLET_DEFAULT_SORT: SortState = { field: 'updatedAt', order: 'desc' };

/** Reads the filters from the address; an unknown state is dropped. */
export function parseWalletFilters(params: URLSearchParams): WalletListState {
  return {
    q: params.get('q') ?? '',
    state: WALLET_STATES.find((candidate) => candidate.id === params.get('state'))?.id ?? '',
  };
}

export function writeWalletFilters(base: URLSearchParams, patch: Partial<WalletListState>): URLSearchParams {
  const merged = { ...parseWalletFilters(base), ...patch };
  return withParams(base, { q: merged.q, state: merged.state });
}

export function hasWalletFilters(filters: WalletListState): boolean {
  return Boolean(filters.q.trim() || filters.state);
}

export function clearWalletFilters(base: URLSearchParams): URLSearchParams {
  return withParams(base, { q: undefined, state: undefined, page: undefined });
}

/** The words of a wallet's state for a row: on hold wins, then below zero, empty, with balance. */
export function walletStateOf(row: { balance: string; frozen: unknown }): CustomerWalletState {
  const balance = Number(row.balance);
  if (row.frozen) return 'frozen';
  if (balance < 0) return 'negative';
  return balance > 0 ? 'positive' : 'zero';
}

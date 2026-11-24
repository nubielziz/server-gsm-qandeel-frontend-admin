// Small helpers the accounts mock handlers share: the stores a request needs (accounts, wallets, orders, sessions, settings), the checks
// on input, and the made-up password. Mocks fake answers and simple state changes only; the real server owns the rules (decision 014).
import type { MockOrder } from '@/mocks/orders';
import { settingsStore, type MockSettings } from '@/mocks/settings';
import type { Rank, RankKind, WalletKind } from '../types';
import { openSessions, ordersByAccount } from './links';
import { accountState } from './store';
import type { AccountState, MockAccount } from './types';
import { walletState, type WalletState } from './walletStore';

/** The stores an accounts answer is built from. */
export type Context = {
  state: AccountState;
  wallets: WalletState;
  settings: MockSettings;
  orders: Map<number, MockOrder[]>;
  sessions: Map<number, number>;
};

export async function context(): Promise<Context> {
  const [state, wallets, settings, orders, sessions] = await Promise.all([
    accountState(),
    walletState(),
    settingsStore(),
    ordersByAccount(),
    openSessions(),
  ]);
  return { state, wallets, settings, orders, sessions };
}

/** The rank an account is in. A row whose rank is gone reads as the retail rank, the way the server fails closed. */
export function rankOf(ctx: Pick<Context, 'state'>, account: Pick<MockAccount, 'rankId'>): Rank {
  const found = ctx.state.ranks.find(account.rankId);
  if (found) return found;
  const retail = ctx.state.ranks.list().find((rank) => rank.rankKind === 'retail');
  if (!retail) throw new Error('The accounts mock has no retail rank.');
  return retail;
}

/** The kind of an account's rank. */
export const rankKindOf = (ctx: Pick<Context, 'state'>, account: Pick<MockAccount, 'rankId'>): RankKind =>
  rankOf(ctx, account).rankKind;

/** The kind of an account's live wallet: a merchant rank has a merchant wallet, anything else a store balance. */
export const walletKindOf = (
  ctx: Pick<Context, 'state'>,
  account: Pick<MockAccount, 'rankId'>,
): WalletKind => (rankKindOf(ctx, account) === 'merchant' ? 'merchant' : 'store');

export const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** True for a country the shop sells to. */
export const knownShopCountry = (code: string, currencies: Record<string, string>): boolean =>
  Object.hasOwn(currencies, code);

/** The login account that already uses this address (case does not matter), if any. A guest does not hold the address against a login. */
export function loginOwner(state: AccountState, email: string, exceptId?: number): MockAccount | undefined {
  return state.accounts
    .list()
    .find((other) => other.id !== exceptId && other.hasAccount && other.email.toLowerCase() === email);
}

/** The guest record that holds this address, if any. */
export function guestOwner(state: AccountState, email: string, exceptId?: number): MockAccount | undefined {
  return state.accounts
    .list()
    .find((other) => other.id !== exceptId && !other.hasAccount && other.email.toLowerCase() === email);
}

// A password the way the server would generate one (the demo's alphabet, without look-alike characters).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function temporaryPassword(): string {
  return Array.from({ length: 14 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

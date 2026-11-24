// The one place where the accounts mock reads the mocks of other features: the orders (who placed each one), the ledger (who owns each
// wallet account) and the sessions (who is signed in). The orders and the ledger name the account by its own id; the sessions mock says
// `account` with the account id. Mock data only (decision 014).
import type { LedgerOwnerType } from '@/features/finance';
import { orderStore, type MockOrder } from '@/mocks/orders';
import type { LegacyRecord } from '@/mocks/seed/accountIds';
import type { WalletKind } from '../types';
import { sessionStore } from '@/mocks/sessions';

/** The account that placed an order of the orders mock: every order names its buyer `account` by the account id. */
export function accountIdOfOrder(order: MockOrder): number | undefined {
  return order.account.id;
}

/** Every order of the orders mock, grouped by the account that placed it. */
export async function ordersByAccount(): Promise<Map<number, MockOrder[]>> {
  const groups = new Map<number, MockOrder[]>();
  for (const order of (await orderStore()).list()) {
    const id = accountIdOfOrder(order);
    if (id !== undefined) groups.set(id, [...(groups.get(id) ?? []), order]);
  }
  return groups;
}

/**
 * The ledger owner of an account's wallet accounts: the owner type `account` with the account id, for either wallet kind (the ledger mock
 * owns every wallet line that way; a merchant number is its account id).
 */
export function ledgerOwnerOf(
  account: { id: number; legacy: LegacyRecord | null },
  _kind: WalletKind,
): { ownerType: LedgerOwnerType; ownerId: number } {
  return { ownerType: 'account', ownerId: account.id };
}

/** Open sessions by account id: the sessions mock keeps a few sessions of accounts of merchant ranks. */
export async function openSessions(): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  for (const session of (await sessionStore()).list()) {
    if (session.subjectType === 'account')
      counts.set(session.subject.id, (counts.get(session.subject.id) ?? 0) + 1);
  }
  return counts;
}

/** Ends every open session of an account in the sessions mock and says how many there were. */
export async function endSessions(accountId: number): Promise<number> {
  const sessions = await sessionStore();
  const open = sessions
    .list()
    .filter((session) => session.subjectType === 'account' && session.subject.id === accountId);
  for (const session of open) sessions.remove(session.id);
  return open.length;
}

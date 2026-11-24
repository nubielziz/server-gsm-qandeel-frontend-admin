// Tests for the accounts mock seed: the demo's merchants and customers as one list, the numbers they keep or move to, the former pending
// merchant, the ranks, the extra guest, and the keys, prices and requests that follow the new numbers.
import { describe, expect, it } from 'vitest';
import { FORMER_PENDING_REASON, NAMELESS_ACCOUNT, RANK_IDS } from './seed';
import { accountState, resetAccountStore } from './store';

describe('buildAccountState', () => {
  it('lists twenty merchants with their own numbers and thirty-one customers from 101', async () => {
    resetAccountStore();
    const { accounts } = await accountState();
    const ids = accounts.list().map((account) => account.id);
    expect(ids.slice(0, 20)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(ids.slice(20)).toEqual(Array.from({ length: 31 }, (_, index) => index + 101));
    expect(NAMELESS_ACCOUNT.id).toBe(131);
  });

  it('puts a merchant in its demo rank and a customer in the retail rank', async () => {
    resetAccountStore();
    const { accounts } = await accountState();
    expect(accounts.find(1)?.rankId).toBe(RANK_IDS.vip);
    expect(accounts.find(101)?.rankId).toBe(RANK_IDS.retail);
    expect(accounts.list().filter((account) => account.rankId === RANK_IDS.retail)).toHaveLength(31);
  });

  it('turns the one pending merchant into a suspended account with the migration’s reason', async () => {
    resetAccountStore();
    const { accounts } = await accountState();
    const former = accounts.find(20);
    expect(former?.status).toBe('suspended');
    expect(former?.suspension?.reason).toBe(FORMER_PENDING_REASON);
    expect(accounts.list().some((account) => (account.status as string) === 'pending')).toBe(false);
  });

  it('keeps the old record of each account, for the legacy lookup', async () => {
    resetAccountStore();
    const { accounts } = await accountState();
    expect(accounts.find(3)?.legacy).toEqual({ type: 'merchant', id: 3 });
    expect(accounts.find(105)?.legacy).toEqual({ type: 'customer', id: 5 });
  });

  it('gives a customer’s keys, requests and risk the new numbers', async () => {
    resetAccountStore();
    const state = await accountState();
    expect(state.requests.list().map((request) => request.accountId)).toEqual([104, 116]);
    expect([...state.risk.keys()].every((id) => id > 100)).toBe(true);
    expect(state.keys.list().every((key) => key.clientId <= 20)).toBe(true);
    expect(state.prices.list().every((price) => price.clientId <= 20)).toBe(true);
  });

  it('adds a guest with an empty name, as a checkout without one makes', async () => {
    resetAccountStore();
    const { accounts } = await accountState();
    expect(accounts.find(NAMELESS_ACCOUNT.id)).toMatchObject({
      name: '',
      hasAccount: false,
      status: 'active',
    });
  });

  it('starts every time from the seed after a reset', async () => {
    const first = await accountState();
    first.accounts.patch(1, { name: 'Changed' });
    resetAccountStore();
    expect((await accountState()).accounts.find(1)?.name).toBe('Zain Mobile Hub');
  });
});

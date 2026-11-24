// Tests for the wallet mock seed: a merchant starts with the demo's wallet and statement, the first two shop accounts with a login hold the
// credited $50 top-up and the top-up waiting for review, balances are exact, the credited line has a balanced journal, approving the
// waiting one credits it, and the store balance rows list only shop accounts that have a wallet.
import { describe, expect, it } from 'vitest';
import { setupMockApi } from '@/test/mockApi';
import { toWallet } from './dto';
import { context } from './context';
import {
  accountTopUps,
  creditTopUp,
  ensureSeedJournals,
  fromUnits,
  resetWalletStore,
  storeBalanceRows,
  toUnits,
  walletState,
} from './walletStore';

setupMockApi();

const walletOf = async (id: number) => {
  const ctx = await context();
  const account = ctx.state.accounts.find(id);
  if (!account) throw new Error(`No account ${id}`);
  return toWallet(ctx, account);
};

describe('the units', () => {
  it('count in ten-thousandths, so sums are exact', () => {
    expect(toUnits('12.4900')).toBe(124_900);
    expect(toUnits(0.1) + toUnits(0.2)).toBe(toUnits(0.3));
    expect(fromUnits(124_900)).toBe('12.4900');
    expect(fromUnits(-5)).toBe('-0.0005');
  });
});

describe('the seed', () => {
  it('seeds one credited and one waiting $50 top-up, continuing the invoice numbering', async () => {
    resetWalletStore();
    const topUps = await accountTopUps();
    expect(topUps.map((t) => [t.id, t.status, t.amount, t.invoiceId])).toEqual([
      [2001, 'approved', 50, 70],
      [2002, 'pending', 50, 71],
    ]);
    const [credited, waiting] = topUps;
    expect(await walletOf(credited.accountId)).toMatchObject({
      kind: 'store',
      balance: '50.0000',
      available: '50.0000',
      frozen: null,
      openDisputes: 0,
    });
    expect(await walletOf(waiting.accountId)).toMatchObject({ balance: '0.0000', available: '0.0000' });
    expect((await walletOf(waiting.accountId)).pendingTopUps).toEqual({ count: 1, amount: '50.0000' });
  });

  it('starts a merchant with the demo’s wallet and the statement the ledger holds', async () => {
    resetWalletStore();
    expect(await walletOf(1)).toMatchObject({
      kind: 'merchant',
      balance: '1209.7500',
      reserved: '71.2300',
      creditLimit: '2000.0000',
    });
    const state = await walletState();
    expect((state.statements.get(1) ?? []).length).toBeGreaterThan(100);
  });

  it('gives the credited line a journal the first time one is needed', async () => {
    resetWalletStore();
    const [credited] = await accountTopUps();
    await ensureSeedJournals();
    const line = (await walletState()).statements.get(credited.accountId)?.[0];
    expect(line?.transactionId).toBeGreaterThan(0);
  });

  it('credits the waiting top-up once approved', async () => {
    resetWalletStore();
    const [, waiting] = await accountTopUps();
    await creditTopUp(waiting.id, 'Rami K.');
    expect(await walletOf(waiting.accountId)).toMatchObject({ balance: '50.0000', available: '50.0000' });
    const lines = (await walletState()).statements.get(waiting.accountId) ?? [];
    expect(lines[0]).toMatchObject({ kind: 'deposit', amount: '50.0000', balanceAfter: '50.0000' });
    expect((await accountTopUps(waiting.accountId))[0].status).toBe('approved');
  });
});

describe('the store balance rows', () => {
  it('lists the shop accounts that have a wallet, with the account id as the customer id', async () => {
    resetWalletStore();
    const rows = await storeBalanceRows();
    expect(rows.map((row) => [row.customer.id, row.balance])).toEqual([[101, '50.0000']]);
    expect(rows[0].customer).toMatchObject({ name: 'Daniel Whitmore', status: 'active' });
  });
});

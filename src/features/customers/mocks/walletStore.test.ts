// Tests for the customer wallet mock seed: the first two customers with an active account hold the credited $50 top-up and the
// top-up waiting for review, balances are exact, the credited line has a balanced journal, and approving the waiting one credits it.
import { describe, expect, it } from 'vitest';
import {
  creditTopUp,
  customerTopUps,
  ensureSeedJournals,
  resetWalletStore,
  walletOf,
  walletState,
} from './walletStore';

describe('the seed', () => {
  it('seeds one credited and one waiting $50 top-up, continuing the invoice numbering', async () => {
    resetWalletStore();
    const topUps = await customerTopUps();
    expect(topUps.map((t) => [t.id, t.status, t.amount, t.invoiceId])).toEqual([
      [2001, 'approved', 50, 70],
      [2002, 'pending', 50, 71],
    ]);
    const [credited, waiting] = topUps;
    expect(await walletOf(credited.customerId)).toMatchObject({
      balance: '50.0000',
      available: '50.0000',
      frozen: null,
      openDisputes: 0,
    });
    expect(await walletOf(waiting.customerId)).toMatchObject({ balance: '0.0000', available: '0.0000' });
  });

  it('gives the credited line a journal the first time one is needed', async () => {
    resetWalletStore();
    const [credited] = await customerTopUps();
    await ensureSeedJournals();
    const line = (await walletState()).statements.get(credited.customerId)?.[0];
    expect(line?.transactionId).toBeGreaterThan(0);
  });

  it('credits the waiting top-up once approved', async () => {
    resetWalletStore();
    const [, waiting] = await customerTopUps();
    await creditTopUp(waiting.id, 'Rami K.');
    expect(await walletOf(waiting.customerId)).toMatchObject({ balance: '50.0000', available: '50.0000' });
    const lines = (await walletState()).statements.get(waiting.customerId) ?? [];
    expect(lines[0]).toMatchObject({ kind: 'deposit', amount: '50.0000', balanceAfter: '50.0000' });
  });
});

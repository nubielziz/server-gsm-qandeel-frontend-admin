// Tests for the ledger mock: the demo's journals say who owns each wallet line the way the server does (an `account`, or a `supplier`), and a
// new entry keeps the owner it is posted with. Mock data only (decision 014).
import { afterEach, describe, expect, it } from 'vitest';
import { ledgerStore, postLedger, resetLedgerStore } from './ledger';

afterEach(() => resetLedgerStore());

describe('the demo journals', () => {
  it('give every merchant wallet line to an account of the merchant’s number, and prepaid lines to a supplier', async () => {
    const lines = (await ledgerStore()).list().flatMap((entry) => entry.entries);
    const wallets = lines.filter((line) => line.account.kind === 'client_wallet');
    expect(wallets.length).toBeGreaterThan(100);
    expect(
      wallets.every((line) => line.account.ownerType === 'account' && (line.account.ownerId ?? 0) > 0),
    ).toBe(true);
    expect(
      lines
        .filter((line) => line.account.kind === 'supplier_prepaid')
        .every((line) => line.account.ownerType === 'supplier'),
    ).toBe(true);
    // No line of the mock carries a word of the old model.
    expect(new Set(lines.map((line) => line.account.ownerType))).toEqual(
      new Set([null, 'account', 'supplier']),
    );
  });

  it('name each owner, so the Ledger can show the account', async () => {
    const owned = (await ledgerStore())
      .list()
      .flatMap((entry) => entry.entries)
      .filter((line) => line.account.ownerType === 'account');
    expect(
      owned.every((line) => typeof line.account.ownerName === 'string' && line.account.ownerName !== ''),
    ).toBe(true);
  });
});

describe('postLedger', () => {
  it('keeps the owner of each line it is given and gives one ledger account to one (kind, owner) pair', async () => {
    const first = await postLedger({
      kind: 'adjustment',
      memo: 'Test',
      orderId: 7,
      by: 'Staff',
      lines: [
        { kind: 'adjustments', amount: 5 },
        {
          kind: 'customer_wallet',
          ownerType: 'account',
          ownerId: 103,
          ownerName: 'Lukas Brandt',
          amount: -5,
        },
      ],
    });
    const second = await postLedger({
      kind: 'adjustment',
      memo: 'Test again',
      orderId: 8,
      by: 'Staff',
      lines: [
        { kind: 'adjustments', amount: 5 },
        {
          kind: 'customer_wallet',
          ownerType: 'account',
          ownerId: 103,
          ownerName: 'Lukas Brandt',
          amount: -5,
        },
      ],
    });
    expect(first.entries[1].account).toMatchObject({
      kind: 'customer_wallet',
      ownerType: 'account',
      ownerId: 103,
    });
    expect(second.entries[1].account.id).toBe(first.entries[1].account.id);
    expect(first.entries[0].account.ownerType).toBeNull();
  });
});

// Tests for the trial balance helpers: names, the debit / credit split and the order of the lines.
import { describe, expect, it } from 'vitest';
import { accountName, balanceOf, booksBalance, toTrialLines } from './accounts';

describe('toTrialLines', () => {
  const lines = toTrialLines([
    { kind: 'revenue', balance: '-8796.1500', accounts: 1 },
    { kind: 'gift_cards', balance: '12.0000', accounts: 2 },
    { kind: 'bank', balance: '28819.0800', accounts: 1 },
    { kind: 'adjustments', balance: '0.0000', accounts: 1 },
  ]);

  it('puts a debit balance in the debit column and a credit balance in the credit column', () => {
    expect(lines.find((line) => line.kind === 'bank')).toMatchObject({ debit: '28819.0800', credit: null });
    expect(lines.find((line) => line.kind === 'revenue')).toMatchObject({ debit: null, credit: '8796.1500' });
    expect(lines.find((line) => line.kind === 'adjustments')).toMatchObject({ debit: null, credit: null });
  });

  it('follows the demo’s chart of accounts and puts kinds it does not know last', () => {
    expect(lines.map((line) => line.kind)).toEqual(['bank', 'revenue', 'adjustments', 'gift_cards']);
    expect(lines[0]).toMatchObject({ name: 'Bank', type: 'Asset' });
    expect(lines[3]).toMatchObject({ name: 'Gift cards', type: '' });
  });
});

describe('helpers', () => {
  it('names an account kind', () => {
    expect(accountName('client_wallet')).toBe('Client wallets');
    expect(accountName('chargeback_reserve')).toBe('Chargeback reserve');
  });

  it('compares the server’s two totals', () => {
    expect(booksBalance({ totalDebit: '10.5000', totalCredit: '10.50' })).toBe(true);
    expect(booksBalance({ totalDebit: '10.5000', totalCredit: '10.4900' })).toBe(false);
  });

  it('finds the balance of one kind', () => {
    const rows = [{ kind: 'bank', balance: '5.0000', accounts: 1 }];
    expect(balanceOf(rows, 'bank')?.balance).toBe('5.0000');
    expect(balanceOf(rows, 'cogs')).toBeUndefined();
  });
});

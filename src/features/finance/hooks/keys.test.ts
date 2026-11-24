// Tests for the finance query keys: what a decision on a deposit makes stale, for a merchant wallet and a store balance alike.
import { describe, expect, it } from 'vitest';
import { ACCOUNT_WALLET_KEY, DASHBOARD_KEY } from '@/lib/query';
import type { Payment } from '../types';
import {
  ACCOUNT_PAYMENTS_KEY,
  ACCOUNT_STATEMENT_KEY,
  APPROVE_STALE_KEYS,
  DEPOSIT_STALE_KEYS,
  STORE_BALANCES_KEY,
  staleDeposit,
} from './keys';

const merchant = {
  id: 1048,
  client: { id: 3, name: 'Phone Doctor FZE', group: null, walletBalance: null },
  customer: null,
};
const store = {
  id: 2002,
  client: null,
  customer: { id: 103, name: 'Lukas Brandt', email: 'lukas@example.com', walletBalance: null },
};

describe('what an approval makes stale', () => {
  it('invalidates the shared account wallet key, whatever the kind of wallet the deposit fills', () => {
    expect(APPROVE_STALE_KEYS).toContainEqual(ACCOUNT_WALLET_KEY);
    expect(APPROVE_STALE_KEYS).toContainEqual(ACCOUNT_STATEMENT_KEY);
    expect(APPROVE_STALE_KEYS).toContainEqual(ACCOUNT_PAYMENTS_KEY);
    expect(APPROVE_STALE_KEYS).toContainEqual(STORE_BALANCES_KEY);
  });

  it('keeps the counts and the sidebar figure for a rejection, which moves no money', () => {
    expect(DEPOSIT_STALE_KEYS).toContainEqual(DASHBOARD_KEY);
    for (const key of [ACCOUNT_WALLET_KEY, ACCOUNT_STATEMENT_KEY, STORE_BALANCES_KEY]) {
      expect(DEPOSIT_STALE_KEYS).not.toContainEqual(key);
    }
  });

  it('writes the prefixes of the accounts feature’s own keys, never the old merchants or customers ones', () => {
    expect(ACCOUNT_WALLET_KEY).toEqual(['api', 'accounts', 'wallet']);
    expect(ACCOUNT_STATEMENT_KEY).toEqual(['api', 'accounts', 'statement']);
    expect(ACCOUNT_PAYMENTS_KEY).toEqual(['api', 'accounts', 'payments']);
    const written = JSON.stringify([...APPROVE_STALE_KEYS]);
    expect(written).not.toContain('customers');
    expect(written).not.toContain('merchants');
  });
});

describe('staleDeposit', () => {
  it('refreshes the account record of a merchant wallet’s deposit by its account id', () => {
    expect(staleDeposit(merchant as Pick<Payment, 'id' | 'client' | 'customer'>)).toEqual([
      { resource: 'payments', id: 1048 },
      { resource: 'ledger/transactions' },
      { resource: 'invoices' },
      { resource: 'clients', id: 3 },
    ]);
  });

  it('refreshes the account record of a store balance’s top-up too: the record is the accounts one, never the customers one', () => {
    const targets = staleDeposit(store as Pick<Payment, 'id' | 'client' | 'customer'>);
    expect(targets).toContainEqual({ resource: 'clients', id: 103 });
    expect(targets.some((target) => target.resource === 'customers')).toBe(false);
  });
});

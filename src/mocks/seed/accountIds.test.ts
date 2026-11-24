// Tests for the one number space of the accounts mock: merchants keep their numbers, customer N is account 100 + N, and the legacy record of
// an account follows from its number.
import { describe, expect, it } from 'vitest';
import {
  accountIdOfDemo,
  accountIdOfLegacy,
  CUSTOMER_ACCOUNT_OFFSET,
  customerAccountId,
  legacyRecordOf,
  merchantAccountId,
} from './accountIds';

describe('accountIdOfDemo', () => {
  it('keeps a merchant’s number and moves a customer’s by 100', () => {
    expect(accountIdOfDemo('m3')).toBe(3);
    expect(accountIdOfDemo('m20')).toBe(20);
    expect(accountIdOfDemo('c1')).toBe(101);
    expect(accountIdOfDemo('c30')).toBe(130);
    expect(CUSTOMER_ACCOUNT_OFFSET).toBe(100);
  });

  it('throws for an id that ends in no digits, as the demo helper does', () => {
    expect(() => accountIdOfDemo('IMEI-ICL-CHK')).toThrow(/does not end in a number/);
  });
});

describe('the other helpers', () => {
  it('map the numbers of the old records', () => {
    expect(customerAccountId(31)).toBe(131);
    expect(merchantAccountId(7)).toBe(7);
    expect(accountIdOfLegacy('customer', 5)).toBe(105);
    expect(accountIdOfLegacy('merchant', 5)).toBe(5);
    expect(accountIdOfLegacy('client', 5)).toBe(5);
  });

  it('read the old record of an account by its number space', () => {
    expect(legacyRecordOf(7)).toEqual({ type: 'merchant', id: 7 });
    expect(legacyRecordOf(100)).toEqual({ type: 'merchant', id: 100 });
    expect(legacyRecordOf(101)).toEqual({ type: 'customer', id: 1 });
    expect(legacyRecordOf(131)).toEqual({ type: 'customer', id: 31 });
  });
});

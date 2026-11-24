// Tests for the links the services feature's components make outside the Product / Services page.
import { describe, expect, it } from 'vitest';
import { MERCHANT_ACCOUNTS_PATH, RANKS_PATH } from './paths';

describe('RANKS_PATH', () => {
  it('is the Accounts page on its Ranks view', () => {
    expect(RANKS_PATH).toBe('/accounts?view=ranks');
  });

  it('is not the old merchants groups tab', () => {
    expect(RANKS_PATH).not.toContain('/merchants');
  });
});

describe('MERCHANT_ACCOUNTS_PATH', () => {
  it('is the Accounts page narrowed to the accounts of merchant ranks', () => {
    expect(MERCHANT_ACCOUNTS_PATH).toBe('/accounts?chip=merchants');
  });
});

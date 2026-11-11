// Tests for the wallet dialogs' input helpers: the amount text, the reason, and the idempotency key's shape.
import { describe, expect, it } from 'vitest';
import { cleanReason, newIdempotencyKey, parseWalletAmount } from './walletInput';

describe('parseWalletAmount', () => {
  it('writes an amount the way the API takes it', () => {
    expect(parseWalletAmount('25')).toBe('25.0000');
    expect(parseWalletAmount('25.5')).toBe('25.5000');
    expect(parseWalletAmount('$1,250.1234')).toBe('1250.1234');
    expect(parseWalletAmount('  007.50 ')).toBe('7.5000');
  });

  it('refuses zero, negatives, a comma decimal and more than four decimals', () => {
    for (const text of ['', '0', '0.0000', '-5', '25,50', '1.23456', 'abc', '1,25']) {
      expect(parseWalletAmount(text)).toBeNull();
    }
  });
});

describe('cleanReason', () => {
  it('trims and joins runs of spaces', () => {
    expect(cleanReason('  Goodwill   credit \n for a slow unlock ')).toBe(
      'Goodwill credit for a slow unlock',
    );
  });
});

describe('newIdempotencyKey', () => {
  it('makes a different key each time, in the characters the server accepts', () => {
    const first = newIdempotencyKey();
    expect(first).toMatch(/^[\x21-\x7e]{1,100}$/);
    expect(newIdempotencyKey()).not.toBe(first);
  });
});

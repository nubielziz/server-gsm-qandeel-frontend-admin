// Tests for the names of ledger entry kinds and the entry number.
import { describe, expect, it } from 'vitest';
import { journalLabel, ledgerKindLabel } from './kinds';

describe('ledgerKindLabel', () => {
  it('uses the demo’s names', () => {
    expect(ledgerKindLabel('order_settle')).toBe('Order settled');
    expect(ledgerKindLabel('b2c_payment')).toBe('Customer payment');
  });

  it('writes a kind it does not know in plain words', () => {
    expect(ledgerKindLabel('order_refund')).toBe('Order refund');
    expect(ledgerKindLabel('')).toBe('Entry');
    expect(ledgerKindLabel('toString')).toBe('ToString');
  });
});

describe('journalLabel', () => {
  it('pads the number like the demo', () => {
    expect(journalLabel(25)).toBe('JRN-00025');
    expect(journalLabel(1962)).toBe('JRN-01962');
  });
});

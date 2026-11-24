// Tests for the Invoices part's words: invoice kinds and the square and word of each status, including a value the console does not know.
import { describe, expect, it } from 'vitest';
import { invoiceKind, invoiceStatusLook } from './billingWords';

describe('invoiceKind', () => {
  it('names the kinds and keeps an unknown one as written', () => {
    expect(invoiceKind('topup')).toBe('Top-up');
    expect(invoiceKind('manual')).toBe('Manual');
    expect(invoiceKind('receipt')).toBe('Tax receipt');
    expect(invoiceKind('credit_note')).toBe('credit_note');
    // The statement kind is retired: an old invoice that still has it shows as written.
    expect(invoiceKind('statement')).toBe('statement');
  });
});

describe('invoiceStatusLook', () => {
  it('has a square and a word for each state: Open amber, Paid green, Void hollow', () => {
    expect(invoiceStatusLook('open')).toEqual({ tone: 'warn', label: 'Open' });
    expect(invoiceStatusLook('paid')).toEqual({ tone: 'ok', label: 'Paid' });
    expect(invoiceStatusLook('void')).toEqual({ tone: 'off', label: 'Void' });
  });

  it('shows the server’s word with a hollow square for a state it does not know', () => {
    expect(invoiceStatusLook('refunded')).toEqual({ tone: 'off', label: 'refunded' });
    expect(invoiceStatusLook('')).toEqual({ tone: 'off', label: 'Unknown' });
  });
});

// Tests for the Billing tab's words: invoice kinds and status badges, including a value the console does not know.
import { describe, expect, it } from 'vitest';
import { invoiceKind, invoiceStatusLook } from './billing';

describe('invoiceKind', () => {
  it('names the four kinds and keeps an unknown one as written', () => {
    expect(invoiceKind('topup')).toBe('Top-up');
    expect(invoiceKind('receipt')).toBe('Tax receipt');
    expect(invoiceKind('credit_note')).toBe('credit_note');
  });
});

describe('invoiceStatusLook', () => {
  it('has a word and an icon for each state', () => {
    expect(invoiceStatusLook('open')).toMatchObject({ label: 'Open', tone: 'warn' });
    expect(invoiceStatusLook('paid')).toMatchObject({ label: 'Paid', tone: 'good' });
    expect(invoiceStatusLook('void')).toMatchObject({ label: 'Void', tone: 'neutral' });
  });

  it('shows the server’s word in grey for a state it does not know', () => {
    expect(invoiceStatusLook('refunded')).toEqual({ tone: 'neutral', icon: 'info', label: 'refunded' });
  });
});

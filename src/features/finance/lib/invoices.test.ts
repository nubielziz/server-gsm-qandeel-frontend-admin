// Tests for the invoice helpers: the amount typed in the issue dialog, kinds, badges and who is billed.
import { describe, expect, it } from 'vitest';
import { billedTo, invoiceKindLabel, invoiceStatusBadge, isPositiveMoney, normalizeAmount } from './invoices';
import { parseInvoiceFilters, toInvoiceListFilters, writeInvoiceFilters } from './invoiceView';

describe('normalizeAmount', () => {
  it('writes the amount as the 4-decimal string the API takes', () => {
    expect(normalizeAmount('125.5')).toBe('125.5000');
    expect(normalizeAmount('900')).toBe('900.0000');
    expect(normalizeAmount('$1,250.75')).toBe('1250.7500');
    expect(normalizeAmount('007.1234')).toBe('7.1234');
  });

  it('refuses anything that is not an amount', () => {
    for (const text of ['', 'abc', '12.34567', '-5', '1e3', '.5', '1.2.3'])
      expect(normalizeAmount(text)).toBeNull();
  });

  it('tells a zero amount from a real one by its digits', () => {
    expect(isPositiveMoney('0.0000')).toBe(false);
    expect(isPositiveMoney('0.0001')).toBe(true);
  });
});

describe('labels', () => {
  it('names the kinds and falls back to plain words', () => {
    expect(invoiceKindLabel('manual')).toBe('Manual');
    expect(invoiceKindLabel('credit_note')).toBe('Credit note');
    expect(invoiceStatusBadge('paid')).toMatchObject({ label: 'Paid', tone: 'good' });
    expect(invoiceStatusBadge('open')).toMatchObject({ label: 'Open', tone: 'warn' });
    expect(invoiceStatusBadge('disputed')).toMatchObject({ label: 'Disputed', tone: 'neutral' });
  });

  it('links a merchant and masks a customer’s email', () => {
    expect(billedTo({ client: { id: 3, name: 'Phone Doctor FZE' }, customer: null })).toEqual({
      name: 'Phone Doctor FZE',
      href: '/merchants/3',
    });
    expect(
      billedTo({ client: null, customer: { id: 1, name: 'Daniel', email: 'daniel@mail.example' } }).name,
    ).toBe('da•••@mail.example');
    expect(billedTo({ client: null, customer: null })).toEqual({ name: '–' });
  });
});

describe('the list filters', () => {
  it('read, write and send only known statuses and kinds', () => {
    expect(parseInvoiceFilters(new URLSearchParams('status=paid&kind=nope&q=INV'))).toEqual({
      q: 'INV',
      status: 'paid',
      kind: '',
    });
    expect(writeInvoiceFilters(new URLSearchParams('page=2'), { status: 'open' }).toString()).toBe(
      'page=2&status=open',
    );
    expect(toInvoiceListFilters({ q: ' INV-1 ', status: 'open', kind: 'manual' })).toEqual({
      q: 'INV-1',
      status: 'open',
      kind: 'manual',
    });
  });
});

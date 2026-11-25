// Tests for "Open record": where each kind of record leads, and the ones that lead nowhere.
import { describe, expect, it } from 'vitest';
import { recordTarget } from './link';

describe('recordTarget', () => {
  it('opens an order in the drawer of the page', () => {
    expect(recordTarget('order', 48792, 'ORD-48792 for Zain')).toEqual({ page: 'orders', orderId: 48792 });
    expect(recordTarget('orders', 5, null)).toEqual({ page: 'orders', orderId: 5 });
  });

  it('links an account row to the account with the number it carries', () => {
    expect(recordTarget('account', 7, 'Cairo GSM Lab')).toEqual({ page: 'accounts', to: '/accounts/7' });
    expect(recordTarget('accounts', 7, 'Cairo GSM Lab')).toEqual({ page: 'accounts', to: '/accounts/7' });
  });

  it('keeps the number of an old merchant or client row', () => {
    expect(recordTarget('merchant', 5, 'Cairo GSM Lab')).toEqual({ page: 'accounts', to: '/accounts/5' });
    expect(recordTarget('clients', 5, 'Cairo GSM Lab')).toEqual({ page: 'accounts', to: '/accounts/5' });
  });

  it('sends an old customer row through the lookup, never to the account with the same number', () => {
    expect(recordTarget('customer', 19, 'Jack Turner')).toEqual({
      page: 'accounts',
      to: '/accounts/19?from=customer',
    });
    expect(recordTarget('customers', 19, 'Jack Turner', null)).toEqual({
      page: 'accounts',
      to: '/accounts/19?from=customer',
    });
  });

  it('uses the account the server resolved for the row, whatever the word', () => {
    expect(recordTarget('customer', 19, 'Jack Turner', { id: 119 })).toEqual({
      page: 'accounts',
      to: '/accounts/119',
    });
    expect(recordTarget('merchant', 5, 'Cairo GSM Lab', { id: 5 })).toEqual({
      page: 'accounts',
      to: '/accounts/5',
    });
    expect(recordTarget('account', 0, 'Gone Ltd', { id: 9 })).toEqual({
      page: 'accounts',
      to: '/accounts/9',
    });
  });

  it('falls back to the number of the row when the server resolved no account', () => {
    expect(recordTarget('account', 7, 'Cairo GSM Lab', null)).toEqual({
      page: 'accounts',
      to: '/accounts/7',
    });
    expect(recordTarget('merchant', 5, 'Cairo GSM Lab', undefined)).toEqual({
      page: 'accounts',
      to: '/accounts/5',
    });
  });

  it('links a supplier to its page', () => {
    expect(recordTarget('supplier', 2, 'Gulf Server Hub')).toEqual({
      page: 'suppliers',
      to: '/suppliers?supplier=2',
    });
  });

  it('sends a service to its edit view on Product / Services', () => {
    expect(recordTarget('service', 6, 'T-Mobile USA Unlock')).toEqual({
      page: 'products',
      to: '/products?view=edit&id=6',
    });
    expect(recordTarget('service', 6, '  ')).toEqual({ page: 'products', to: '/products?view=edit&id=6' });
  });

  it('sends a service with no id to the list searched by its name', () => {
    expect(recordTarget('service', 0, 'T-Mobile USA Unlock')).toEqual({
      page: 'products',
      to: '/products?view=all&q=T-Mobile+USA+Unlock',
    });
    expect(recordTarget('service', 0, '  ')).toEqual({ page: 'products', to: '/products?view=all' });
  });

  it('sends the other pages to the tab that holds the record', () => {
    expect(recordTarget('blocklist', 5, 'IMEI 35')).toEqual({ page: 'risk', to: '/risk?tab=block' });
    // A record on the Money page names its view too: the page opens for many permissions, the link needs the view's own.
    expect(recordTarget('refund', 1001, 'Goodwill')).toEqual({
      page: 'money',
      to: '/money?view=refunds',
      view: 'refunds',
    });
    expect(recordTarget('dispute', 2004, 'DP-2004')).toEqual({
      page: 'money',
      to: '/money?view=disputes',
      view: 'disputes',
    });
    expect(recordTarget('staff', 2, 'Lina S.')).toEqual({ page: 'access', to: '/access?tab=admins' });
  });

  it('gives nothing for a record without a page of its own', () => {
    for (const type of ['payment', 'withdrawal', 'setting', 'listing', 'legal', 'ticket', 'session']) {
      expect(recordTarget(type, 3, 'Anything')).toBeNull();
    }
  });

  it('gives nothing for a record that has no id', () => {
    expect(recordTarget('order', 0, 'ORD')).toBeNull();
    expect(recordTarget('merchant', Number.NaN, 'Cairo')).toBeNull();
    expect(recordTarget('customer', 0, 'Jack Turner')).toBeNull();
    expect(recordTarget('account', 0, 'Gone Ltd', null)).toBeNull();
  });
});

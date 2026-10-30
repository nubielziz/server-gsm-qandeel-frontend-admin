// Tests for "Open record": where each kind of record leads, and the ones that lead nowhere.
import { describe, expect, it } from 'vitest';
import { recordTarget } from './link';

describe('recordTarget', () => {
  it('opens an order in the drawer of the page', () => {
    expect(recordTarget('order', 48792, 'ORD-48792 for Zain')).toEqual({ page: 'orders', orderId: 48792 });
    expect(recordTarget('orders', 5, null)).toEqual({ page: 'orders', orderId: 5 });
  });

  it('links a merchant, a customer and a supplier to their pages', () => {
    expect(recordTarget('merchant', 5, 'Cairo GSM Lab')).toEqual({ page: 'merchants', to: '/merchants/5' });
    expect(recordTarget('clients', 5, 'Cairo GSM Lab')).toEqual({ page: 'merchants', to: '/merchants/5' });
    expect(recordTarget('customer', 19, 'Jack Turner')).toEqual({ page: 'customers', to: '/customers/19' });
    expect(recordTarget('supplier', 2, 'Gulf Server Hub')).toEqual({
      page: 'suppliers',
      to: '/suppliers?supplier=2',
    });
  });

  it('sends a service to the services list searched by its name', () => {
    expect(recordTarget('service', 6, 'T-Mobile USA Unlock')).toEqual({
      page: 'services',
      to: '/services?q=T-Mobile+USA+Unlock',
    });
    expect(recordTarget('service', 6, '  ')).toEqual({ page: 'services', to: '/services' });
  });

  it('sends the other pages to the tab that holds the record', () => {
    expect(recordTarget('blocklist', 5, 'IMEI 35')).toEqual({ page: 'risk', to: '/risk?tab=block' });
    expect(recordTarget('refund', 1001, 'Goodwill')).toEqual({ page: 'refunds', to: '/refunds' });
    expect(recordTarget('dispute', 2004, 'DP-2004')).toEqual({
      page: 'refunds',
      to: '/refunds?tab=disputes',
    });
    expect(recordTarget('staff', 2, 'Lina S.')).toEqual({ page: 'access', to: '/access?tab=admins' });
  });

  it('gives nothing for a record without a page of its own', () => {
    for (const type of [
      'payment',
      'withdrawal',
      'setting',
      'listing',
      'legal',
      'ticket',
      'session',
      'plan',
    ]) {
      expect(recordTarget(type, 3, 'Anything')).toBeNull();
    }
  });

  it('gives nothing for a record that has no id', () => {
    expect(recordTarget('order', 0, 'ORD')).toBeNull();
    expect(recordTarget('merchant', Number.NaN, 'Cairo')).toBeNull();
  });
});

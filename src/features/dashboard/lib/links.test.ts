// Tests for the dashboard's link building: the orders addresses (built by the orders feature) and the fixed addresses of the
// pages that are not built yet (ARCHITECTURE.md §5.2).
import { ordersListPath } from '@/features/orders';
import { describe, expect, it } from 'vitest';
import {
  accountsListTarget,
  accountTarget,
  channelOf,
  queueTarget,
  SUPPLIERS_PAGE,
  supplierTarget,
} from './links';

describe('channelOf', () => {
  it('sets no orders filter for all channels, and the channel for the other two', () => {
    expect(channelOf('all')).toBe('');
    expect(channelOf('b2b')).toBe('b2b');
    expect(channelOf('b2c')).toBe('b2c');
  });
});

describe('queueTarget', () => {
  it('opens the orders of one service type, in the channel being shown', () => {
    expect(queueTarget('imei', 'all')).toEqual({ page: 'orders', to: '/orders?type=imei' });
    expect(queueTarget('server', 'b2b')).toEqual({ page: 'orders', to: '/orders?type=server&channel=b2b' });
    expect(queueTarget('file', 'b2c')).toEqual({ page: 'orders', to: '/orders?type=file&channel=b2c' });
  });

  it('builds the address with the orders feature’s own function', () => {
    expect(queueTarget('remote', 'b2c').to).toBe(ordersListPath({ type: 'remote', channel: 'b2c' }));
  });
});

describe('page targets', () => {
  it('names the page each address needs, so a button is shown only to staff who may open it', () => {
    expect(supplierTarget(2)).toEqual({ page: 'suppliers', to: '/suppliers?supplier=2' });
    expect(SUPPLIERS_PAGE).toEqual({ page: 'suppliers', to: '/suppliers' });
  });

  it('opens an account, merchant or buyer, on the Accounts page with the address the accounts feature builds', () => {
    expect(accountTarget(17)).toEqual({ page: 'accounts', to: '/accounts/17' });
    expect(accountTarget(117, 'wallet')).toEqual({ page: 'accounts', to: '/accounts/117?tab=wallet' });
  });

  it('opens the list of accounts with a population and a sort', () => {
    expect(accountsListTarget()).toEqual({ page: 'accounts', to: '/accounts' });
    expect(accountsListTarget({ chip: 'merchants', sort: 'balance', dir: 'asc' })).toEqual({
      page: 'accounts',
      to: '/accounts?chip=merchants&sort=balance',
    });
  });
});

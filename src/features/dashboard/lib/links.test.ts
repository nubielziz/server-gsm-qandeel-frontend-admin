// Tests for the dashboard's link building: the orders addresses (built by the orders feature) and the fixed addresses of the
// pages that are not built yet (ARCHITECTURE.md §5.2).
import { ordersListPath } from '@/features/orders';
import { describe, expect, it } from 'vitest';
import {
  channelOf,
  customerTarget,
  merchantTarget,
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
    expect(merchantTarget(17)).toEqual({ page: 'merchants', to: '/merchants/17' });
    expect(customerTarget(7)).toEqual({ page: 'customers', to: '/customers/7' });
    expect(SUPPLIERS_PAGE).toEqual({ page: 'suppliers', to: '/suppliers' });
  });
});

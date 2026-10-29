// Tests for how the screen names an order's state and how the demo's tabs become API filters.
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import {
  displayStatus,
  isHeld,
  isOpen,
  isOrderTab,
  ORDER_TABS,
  orderLabel,
  SINGLE_STATUS_TABS,
  sourceLabel,
  tabFilters,
} from './status';

describe('displayStatus', () => {
  it.each([
    [{ status: 'pending', queue: 'pending' }, 'queued'],
    [{ status: 'pending', queue: null }, 'queued'],
    [{ status: 'processing', queue: null }, 'processing'],
    [{ status: 'processing', queue: 'needs_attention' }, 'review'],
    [{ status: 'pending', queue: 'manual' }, 'review'],
    [{ status: 'pending', queue: 'review' }, 'review'],
    [{ status: 'completed', queue: null }, 'completed'],
    [{ status: 'completed', queue: 'verification' }, 'review'],
    [{ status: 'rejected', queue: null }, 'rejected'],
  ] as const)('reads %o as %s', (state, expected) => {
    expect(displayStatus(state)).toBe(expected);
  });
});

describe('isOpen and isHeld', () => {
  it('counts pending and processing orders as open', () => {
    expect(isOpen({ status: 'pending' })).toBe(true);
    expect(isOpen({ status: 'processing' })).toBe(true);
    expect(isOpen({ status: 'completed' })).toBe(false);
    expect(isOpen({ status: 'rejected' })).toBe(false);
  });

  it('holds only a storefront order in the review queue', () => {
    expect(isHeld({ channel: 'b2c', queue: 'review' })).toBe(true);
    expect(isHeld({ channel: 'b2b', queue: 'review' })).toBe(false);
    expect(isHeld({ channel: 'b2c', queue: 'manual' })).toBe(false);
  });
});

describe('tabs', () => {
  it('are the demo’s seven, in its order', () => {
    expect(ORDER_TABS.map((tab) => [tab.id, tab.label])).toEqual([
      ['open', 'Open'],
      ['review', 'Needs review'],
      ['queued', 'Queued'],
      ['processing', 'Processing'],
      ['completed', 'Completed'],
      ['rejected', 'Rejected'],
      ['all', 'All'],
    ]);
  });

  it('become the API filters of MISMATCHES M20', () => {
    expect(tabFilters('open')).toEqual({ status: ['pending', 'processing'] });
    expect(tabFilters('review')).toEqual({ queue: ['manual', 'needs_attention', 'verification', 'review'] });
    expect(tabFilters('queued')).toEqual({ queue: 'pending' });
    expect(tabFilters('processing')).toEqual({ status: 'processing' });
    expect(tabFilters('completed')).toEqual({ status: 'completed' });
    expect(tabFilters('rejected')).toEqual({ status: 'rejected' });
    expect(tabFilters('all')).toEqual({});
  });

  it('drop the Status column on the tabs that name one status', () => {
    expect(SINGLE_STATUS_TABS).toEqual(['queued', 'rejected']);
  });

  it('are recognised from an address value', () => {
    expect(isOrderTab('review')).toBe(true);
    expect(isOrderTab('everything')).toBe(false);
    expect(isOrderTab(null)).toBe(false);
  });
});

describe('labels', () => {
  it('shows the demo’s id prefixes', () => {
    expect(orderLabel(order({ id: 48100 }))).toBe('ORD-48100');
    expect(orderLabel(order({ id: 20490, channel: 'b2c' }))).toBe('SF-20490');
  });

  it('names the ways an order arrives, and passes an unknown one through', () => {
    expect(sourceLabel('dhru')).toBe('Dhru API');
    expect(sourceLabel('v1')).toBe('REST API');
    expect(sourceLabel('store')).toBe('Storefront');
    expect(sourceLabel('partner-feed')).toBe('partner-feed');
  });
});

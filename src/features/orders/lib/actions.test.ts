// Tests for which actions an order offers in each state, and which one the page recommends.
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import { orderActions } from './actions';

/** The names of the actions that are on, so a test reads as a list. */
function offered(actions: ReturnType<typeof orderActions>): string[] {
  const names = [
    'accept',
    'complete',
    'reject',
    'retry',
    'reroute',
    'fetch',
    'verify',
    'reopen',
    'refund',
    'refundsLink',
    'riskLink',
  ] as const;
  return names.filter((name) => actions[name]);
}

describe('orderActions', () => {
  it('offers Complete first on an order that is processing normally', () => {
    const actions = orderActions(order());
    expect(offered(actions)).toEqual(['complete', 'reject', 'retry', 'reroute', 'fetch']);
    expect(actions.recommended).toBe('complete');
  });

  it('has nothing to fetch before the supplier has a reference', () => {
    const queued = orderActions(
      order({ status: 'pending', queue: 'pending', supplier: null, supplierRef: null }),
    );
    expect(queued.fetch).toBe(false);
    expect(queued.retry).toBe(true);
  });

  it('puts Accept first on a manual order, and does not retry what was never sent', () => {
    const actions = orderActions(
      order({ status: 'pending', queue: 'manual', supplier: null, supplierRef: null }),
    );
    expect(offered(actions)).toEqual(['accept', 'complete', 'reject']);
    expect(actions.recommended).toBe('accept');
  });

  it('recommends Fetch after a supplier timeout when there is a reference, else Retry', () => {
    const timedOut = orderActions(order({ queue: 'needs_attention' }));
    expect(timedOut.recommended).toBe('fetch');
    expect(timedOut.complete).toBe(true);
    expect(orderActions(order({ queue: 'needs_attention', supplierRef: null })).recommended).toBe('retry');
  });

  it('sends a held storefront order to the Risk page and offers nothing else', () => {
    const actions = orderActions(order({ channel: 'b2c', client: null, status: 'pending', queue: 'review' }));
    expect(offered(actions)).toEqual(['riskLink']);
    expect(actions.recommended).toBe('risk');
  });

  it('offers Reopen and Refund on a completed merchant order', () => {
    const actions = orderActions(order({ status: 'completed' }));
    expect(offered(actions)).toEqual(['reopen', 'refund']);
    expect(actions.recommended).toBeNull();
  });

  it('refunds a completed storefront order from the Refunds page', () => {
    const actions = orderActions(order({ status: 'completed', channel: 'b2c', client: null }));
    expect(offered(actions)).toEqual(['reopen', 'refundsLink']);
  });

  it('asks for a verification decision on a delivered order that waits for one', () => {
    const actions = orderActions(order({ status: 'completed', queue: 'verification' }));
    expect(offered(actions)).toEqual(['verify', 'reopen']);
    expect(actions.recommended).toBe('verify');
  });

  it('offers nothing on a rejected order', () => {
    expect(offered(orderActions(order({ status: 'rejected' })))).toEqual([]);
  });
});

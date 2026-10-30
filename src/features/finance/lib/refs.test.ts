// Tests for the links from a journal entry back to the record it is about.
import { describe, expect, it } from 'vitest';
import { referenceLink } from './refs';

describe('referenceLink', () => {
  it('links an order, a deposit and an invoice', () => {
    expect(referenceLink('order', 48100)).toEqual({ label: 'Order #48100', to: '/orders?order=48100' });
    expect(referenceLink('payment', 1048)).toEqual({
      label: 'Deposit PAY-1048',
      to: '/finance?tab=payments&status=all&payment=1048',
    });
    expect(referenceLink('invoice', 7)?.to).toBe('/finance?tab=invoices&invoice=7');
  });

  it('has no link for the rest, or for an empty reference', () => {
    expect(referenceLink('system', 3)).toBeNull();
    expect(referenceLink('order', 0)).toBeNull();
  });
});

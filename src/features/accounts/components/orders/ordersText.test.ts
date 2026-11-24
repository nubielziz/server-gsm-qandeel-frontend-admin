// Tests for what the Orders part says when an account has no order.
import { describe, expect, it } from 'vitest';
import { ordersEmpty } from './ordersText';

describe('ordersEmpty', () => {
  it('tells an active account with a login that orders show here as soon as it places one', () => {
    expect(ordersEmpty({ status: 'active', hasAccount: true })).toEqual({
      title: 'No orders yet',
      text: 'Orders show here as soon as they place one.',
    });
  });

  it.each(['suspended', 'blocked'] as const)('says an account that is %s cannot order', (status) => {
    expect(ordersEmpty({ status, hasAccount: true })).toEqual({
      title: 'No orders',
      text: `This account cannot order while it is ${status}.`,
    });
  });

  it('says a blocked guest cannot order either, since the status is the fact that matters', () => {
    expect(ordersEmpty({ status: 'blocked', hasAccount: false }).text).toBe(
      'This account cannot order while it is blocked.',
    );
  });

  it('says only "No orders" for an active guest and for an anonymized account', () => {
    expect(ordersEmpty({ status: 'active', hasAccount: false })).toEqual({ title: 'No orders' });
    expect(ordersEmpty({ status: 'anonymized', hasAccount: true })).toEqual({ title: 'No orders' });
  });
});

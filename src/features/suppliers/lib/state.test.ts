// Tests for the supplier state words: Disabled wins over health, which suppliers need attention, where orders may be sent, and
// the counts under the page title.
import { describe, expect, it } from 'vitest';
import type { Supplier } from '../types';
import { canTakeOrders, isEnabled, needsAttention, STATE_BADGE, summarize, supplierState } from './state';

const supplier = (overrides: Partial<Supplier>): Supplier =>
  ({ status: 'active', health: 'up', lowBalance: false, ...overrides }) as Supplier;

describe('supplierState', () => {
  it('shows Disabled whatever the health is, and the health otherwise', () => {
    expect(supplierState(supplier({ status: 'disabled', health: 'down' }))).toBe('disabled');
    expect(supplierState(supplier({ health: 'degraded' }))).toBe('degraded');
    expect(STATE_BADGE.up).toEqual({ label: 'Healthy', tone: 'good', icon: 'checkCircle' });
    expect(STATE_BADGE.down.label).toBe('Down');
  });

  it('treats any status but "disabled" as enabled', () => {
    expect(isEnabled(supplier({ status: 'active' }))).toBe(true);
    expect(isEnabled(supplier({ status: 'disabled' }))).toBe(false);
  });
});

describe('needsAttention and canTakeOrders', () => {
  it('flags an enabled supplier that is not up, never a disabled one', () => {
    expect(needsAttention(supplier({ health: 'degraded' }))).toBe(true);
    expect(needsAttention(supplier({ health: 'down' }))).toBe(true);
    expect(needsAttention(supplier({ health: 'up' }))).toBe(false);
    expect(needsAttention(supplier({ status: 'disabled', health: 'down' }))).toBe(false);
  });

  it('lets orders go to an enabled supplier that is up or degraded, not to a down or disabled one', () => {
    expect(canTakeOrders(supplier({ health: 'up' }))).toBe(true);
    expect(canTakeOrders(supplier({ health: 'degraded' }))).toBe(true);
    expect(canTakeOrders(supplier({ health: 'down' }))).toBe(false);
    expect(canTakeOrders(supplier({ status: 'disabled' }))).toBe(false);
  });
});

describe('summarize', () => {
  it('counts the unhealthy and low-balance suppliers among the enabled ones', () => {
    const list = [
      supplier({ health: 'degraded' }),
      supplier({ lowBalance: true }),
      supplier({ status: 'disabled', health: 'down', lowBalance: true }),
      supplier({}),
    ];
    expect(summarize(list)).toEqual({ total: 4, unhealthy: 1, low: 1 });
  });
});

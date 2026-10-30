// Tests for the small readings of a refund row.
import { describe, expect, it } from 'vitest';
import { isAutomatic, isDelivered, refundActor, refundWhen } from './refund';

describe('refundActor', () => {
  it('names the person who decided it first', () => {
    expect(
      refundActor({ approvedBy: { id: 2, name: 'Lina S.' }, requestedBy: { type: 'customer', name: null } }),
    ).toBe('Lina S.');
  });
  it('falls back to who asked', () => {
    expect(refundActor({ approvedBy: null, requestedBy: { type: 'customer', name: null } })).toBe('Customer');
    expect(refundActor({ approvedBy: null, requestedBy: { type: 'system', name: null } })).toBe('System');
    expect(refundActor({ approvedBy: null, requestedBy: { type: 'staff', name: 'Omar T.' } })).toBe(
      'Omar T.',
    );
  });
});

describe('the other readings', () => {
  it('knows an automatic refund', () => {
    expect(isAutomatic({ requestedBy: { type: 'system', name: 'System' } })).toBe(true);
    expect(isAutomatic({ requestedBy: { type: 'customer', name: null } })).toBe(false);
  });
  it('uses the completion time when there is one', () => {
    expect(refundWhen({ completedAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' })).toBe(
      '2026-01-02T00:00:00Z',
    );
    expect(refundWhen({ completedAt: null, createdAt: '2026-01-01T00:00:00Z' })).toBe('2026-01-01T00:00:00Z');
  });
  it('knows a delivered order', () => {
    expect(isDelivered({ order: { id: 1, deliveredAt: '2026-01-01T00:00:00Z', cost: '1.0000' } })).toBe(true);
    expect(isDelivered({ order: { id: 1, deliveredAt: null, cost: '1.0000' } })).toBe(false);
  });
});

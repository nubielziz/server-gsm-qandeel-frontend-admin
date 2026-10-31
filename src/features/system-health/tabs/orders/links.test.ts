// Tests for the addresses the Orders & suppliers tab links to.
import { describe, expect, it } from 'vitest';
import { RISK_QUEUE_PATH, ordersTabFor, pastSlaPath } from './links';

describe('ordersTabFor', () => {
  it('maps each status word of a "past SLA by status" row to the Orders tab that lists it', () => {
    expect(ordersTabFor('processing')).toBe('processing');
    expect(ordersTabFor('pending')).toBe('queued');
    expect(ordersTabFor('needs_attention')).toBe('review');
    expect(ordersTabFor('completed')).toBe('completed');
    expect(ordersTabFor('rejected')).toBe('rejected');
  });

  it('has no tab for a word the Orders page does not know, and never reads inherited object keys', () => {
    expect(ordersTabFor('on_hold')).toBeUndefined();
    expect(ordersTabFor('toString')).toBeUndefined();
    expect(ordersTabFor('')).toBeUndefined();
  });
});

describe('pastSlaPath', () => {
  it('opens the Orders page on orders past SLA, in the default tab, for the total', () => {
    expect(pastSlaPath()).toBe('/orders?pastSla=true');
  });

  it('adds the tab of the status when the Orders page has one', () => {
    expect(pastSlaPath('processing')).toBe('/orders?tab=processing&pastSla=true');
    expect(pastSlaPath('pending')).toBe('/orders?tab=queued&pastSla=true');
    expect(pastSlaPath('needs_attention')).toBe('/orders?tab=review&pastSla=true');
  });

  it('keeps only "past SLA" for a status without a tab', () => {
    expect(pastSlaPath('on_hold')).toBe('/orders?pastSla=true');
  });
});

describe('RISK_QUEUE_PATH', () => {
  it('is the review queue of the Risk page', () => {
    expect(RISK_QUEUE_PATH).toBe('/risk?tab=queue');
  });
});

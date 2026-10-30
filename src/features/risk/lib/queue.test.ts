// Tests for the review queue's display rules: waits, the amount line, the history line and the refund wording.
import { describe, expect, it } from 'vitest';
import type { HeldOrder } from '../types';
import {
  amountText,
  capturedTotal,
  defaultRefundReason,
  historyText,
  longestWaitMs,
  methodText,
  oldestFirst,
  refundDestination,
  waitMs,
} from './queue';

const NOW = Date.parse('2026-03-01T12:00:00Z');
const held = (id: number, paidAt: string, capturedAmount = '10.0000'): HeldOrder =>
  ({ orderId: id, paidAt, capturedAmount }) as HeldOrder;

describe('waits', () => {
  it('measures the wait and never goes below zero', () => {
    expect(waitMs('2026-03-01T11:00:00Z', NOW)).toBe(3_600_000);
    expect(waitMs('2026-03-01T13:00:00Z', NOW)).toBe(0);
  });

  it('puts the longest wait first and reports it', () => {
    const rows = [held(2, '2026-03-01T11:00:00Z'), held(1, '2026-03-01T09:00:00Z')];
    expect(oldestFirst(rows).map((row) => row.orderId)).toEqual([1, 2]);
    expect(longestWaitMs(rows, NOW)).toBe(3 * 3_600_000);
    expect(longestWaitMs([], NOW)).toBeNull();
  });
});

describe('amounts', () => {
  it('adds up what the held orders captured, for display only', () => {
    expect(capturedTotal([held(1, '', '12.9900'), held(2, '', '25.9900')])).toBeCloseTo(38.98);
  });

  it('writes the customer’s currency and the dollars in brackets when they differ', () => {
    expect(amountText({ capturedAmount: '12.9900', currency: 'USD', fxRate: '1.0000' })).toBe('$12.99');
    expect(amountText({ capturedAmount: '20.0000', currency: 'GBP', fxRate: '0.7900' })).toBe(
      '£15.80 ($20.00)',
    );
  });

  it('writes the payment method in lower case, as the demo does', () => {
    expect(methodText('card')).toBe('card (3ds)');
    expect(methodText('crypto')).toBe('crypto (usdt / btc)');
  });
});

describe('history', () => {
  it('says first order, or counts with the right plural', () => {
    expect(historyText({ earlierOrders: 0, refunds: 0, disputes: 0 })).toBe('First order');
    expect(historyText({ earlierOrders: 1, refunds: 1, disputes: 0 })).toBe(
      '1 earlier order, 1 refund, 0 disputes',
    );
    expect(historyText({ earlierOrders: 3, refunds: 2, disputes: 1 })).toBe(
      '3 earlier orders, 2 refunds, 1 dispute',
    );
  });
});

describe('refund wording', () => {
  it('starts the reason from the first signal, or a general one', () => {
    expect(defaultRefundReason(['Disposable email domain', 'VPN'])).toBe(
      'Refunded after risk review: Disposable email domain',
    );
    expect(defaultRefundReason([])).toBe('Refunded after risk review: high risk score');
  });

  it('sends crypto back by hand and a card to the card', () => {
    expect(refundDestination('card')).toBe('card');
    expect(refundDestination('wallet')).toBe('card');
    expect(refundDestination('crypto')).toContain('by hand');
  });
});

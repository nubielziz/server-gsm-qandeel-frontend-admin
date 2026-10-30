// Tests for the labels: ids as the demo shows them, the badge of each state and the fallback for a state we do not know.
import { describe, expect, it } from 'vitest';
import {
  badgeFor,
  disputeLabel,
  DISPUTE_BADGE,
  isPaymentMethod,
  isRefundStatus,
  PAYMENT_BADGE,
  refundLabel,
  REFUND_BADGE,
  storefrontOrderLabel,
} from './labels';

describe('ids', () => {
  it('adds the demo’s prefixes', () => {
    expect(refundLabel(1007)).toBe('RF-1007');
    expect(disputeLabel(2005)).toBe('DP-2005');
    expect(storefrontOrderLabel(20467)).toBe('SF-20467');
  });
});

describe('badgeFor', () => {
  it('gives the demo’s word, tone and icon for each refund and dispute state', () => {
    expect(badgeFor(REFUND_BADGE, 'requested')).toEqual({
      label: 'Needs approval',
      tone: 'warn',
      icon: 'clock',
    });
    expect(badgeFor(REFUND_BADGE, 'failed').label).toBe('Failed at gateway');
    expect(badgeFor(REFUND_BADGE, 'rejected').label).toBe('Declined');
    expect(badgeFor(DISPUTE_BADGE, 'needs_response')).toEqual({
      label: 'Evidence needed',
      tone: 'crit',
      icon: 'alert',
    });
    expect(badgeFor(DISPUTE_BADGE, 'under_review').label).toBe('With the card network');
  });

  it('shows the server’s word in a neutral badge for a state it does not know', () => {
    expect(badgeFor(REFUND_BADGE, 'pending_bank')).toEqual({
      label: 'pending_bank',
      tone: 'neutral',
      icon: 'info',
    });
  });

  it('reads an unknown or empty payment status as paid, as the demo does', () => {
    expect(badgeFor(PAYMENT_BADGE, '', 'captured').label).toBe('Paid');
    expect(badgeFor(PAYMENT_BADGE, 'weird', 'captured').label).toBe('Paid');
    expect(badgeFor(PAYMENT_BADGE, 'chargeback', 'captured').label).toBe('Chargeback lost');
  });
});

describe('guards', () => {
  it('know the methods and statuses', () => {
    expect(isPaymentMethod('wallet')).toBe(true);
    expect(isPaymentMethod('cash')).toBe(false);
    expect(isRefundStatus('failed')).toBe(true);
    expect(isRefundStatus('toString')).toBe(false);
  });
});

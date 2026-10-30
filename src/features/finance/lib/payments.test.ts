// Tests for the words of the Deposits tab: methods, status badges, the reject reason and the fee text.
import { describe, expect, it } from 'vitest';
import { feeText, methodLabel, paymentLabel, paymentStatusBadge, rejectReason } from './payments';
import { paymentListFilters, parsePaymentFilter } from './paymentView';

describe('rejectReason', () => {
  it('puts the message after the chosen reason', () => {
    expect(rejectReason('Receipt amount does not match the transfer', '$60 on the receipt')).toBe(
      'Receipt amount does not match the transfer. $60 on the receipt',
    );
  });

  it('uses the reason alone, or the message alone for "Other"', () => {
    expect(rejectReason('Payment not received in the bank account', ' ')).toBe(
      'Payment not received in the bank account',
    );
    expect(rejectReason('Other', ' Sent to the wrong account ')).toBe('Sent to the wrong account');
  });

  it('says Rejected when there is nothing else', () => {
    expect(rejectReason('Other', '')).toBe('Rejected');
  });
});

describe('feeText', () => {
  it('shows the fee with its share, or None', () => {
    expect(feeText({ amount: '2500.0000', feeAmount: '25.0000' })).toBe('$25.00 (1%)');
    expect(feeText({ amount: '300.0000', feeAmount: '0.0000' })).toBe('None');
    expect(feeText({ amount: '0.0000', feeAmount: '5.0000' })).toBe('$5.00');
  });
});

describe('labels', () => {
  it('names the demo’s four methods and falls back to the gateway, then the words', () => {
    expect(methodLabel({ methodType: 'usdt', gateway: null })).toBe('USDT (TRC20)');
    expect(methodLabel({ methodType: 'cliq' as 'bank', gateway: { id: 9, name: 'CliQ' } })).toBe('CliQ');
    expect(methodLabel({ methodType: 'cash_on_pickup' as 'bank', gateway: null })).toBe('Cash on pickup');
    expect(paymentLabel(1048)).toBe('PAY-1048');
  });

  it('gives each status a word and an icon, and an unknown status its own word in grey', () => {
    expect(paymentStatusBadge('pending')).toMatchObject({ label: 'Pending', tone: 'warn', icon: 'clock' });
    expect(paymentStatusBadge('approved')).toMatchObject({ label: 'Approved', tone: 'good' });
    expect(paymentStatusBadge('rejected')).toMatchObject({ label: 'Rejected', tone: 'crit' });
    expect(paymentStatusBadge('on_hold')).toMatchObject({ label: 'On hold', tone: 'neutral' });
  });
});

describe('the sub-tabs', () => {
  it('open on Pending and ask for top-ups only', () => {
    expect(parsePaymentFilter(new URLSearchParams())).toBe('pending');
    expect(parsePaymentFilter(new URLSearchParams('status=all'))).toBe('all');
    expect(parsePaymentFilter(new URLSearchParams('status=bogus'))).toBe('pending');
    expect(paymentListFilters('rejected')).toEqual({ purpose: 'topup', status: 'rejected' });
    expect(paymentListFilters('all')).toEqual({ purpose: 'topup' });
  });
});

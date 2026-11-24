// Tests for the words of the Deposits tab: methods, status badges, the reject reason and the fee text.
import { describe, expect, it } from 'vitest';
import {
  disputeText,
  feeText,
  methodLabel,
  payerName,
  paymentLabel,
  paymentStatusBadge,
  rejectReason,
} from './payments';
import { PAYMENT_OWNERS, paymentListFilters, parsePaymentFilter, parsePaymentOwner } from './paymentView';

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

describe('the owner filter', () => {
  it('names the two kinds of wallet and keeps the wire words as ids', () => {
    expect(PAYMENT_OWNERS).toEqual([
      { id: 'all', label: 'All payers' },
      { id: 'merchant', label: 'Merchant wallet' },
      { id: 'customer', label: 'Store balance' },
    ]);
    expect(parsePaymentOwner(new URLSearchParams('owner=customer'))).toBe('customer');
    expect(parsePaymentOwner(new URLSearchParams('owner=account'))).toBe('all');
  });

  it('sends the owner as the wire says it, and nothing for everyone', () => {
    expect(paymentListFilters('pending', 'customer')).toEqual({
      purpose: 'topup',
      status: 'pending',
      owner: 'customer',
    });
    expect(paymentListFilters('all', 'merchant')).toEqual({ purpose: 'topup', owner: 'merchant' });
    expect(paymentListFilters('all', 'all')).toEqual({ purpose: 'topup' });
  });
});

describe('disputeText', () => {
  const dispute = (status: string) => ({ status }) as never;

  it('speaks of the account’s store balance on hold while a store top-up is disputed, and of the wallet for a merchant', () => {
    expect(disputeText({ customer: customer5(), dispute: dispute('needs_response') })).toBe(
      'The account’s store balance is on hold while the dispute is open.',
    );
    expect(disputeText({ customer: null, dispute: dispute('under_review') })).toBe(
      'The card network is reviewing the chargeback of this top-up.',
    );
  });

  it('says the credit was taken back, and that a store balance may now be below zero', () => {
    expect(disputeText({ customer: customer5(), dispute: dispute('lost') })).toBe(
      'The credit was taken back from the account’s store balance, which may now be below zero.',
    );
    expect(disputeText({ customer: null, dispute: dispute('lost') })).toBe(
      'The credit was taken back from the merchant’s wallet.',
    );
  });

  it('is silent without a dispute', () => {
    expect(disputeText({ customer: null, dispute: null })).toBeNull();
  });
});

function customer5() {
  return { id: 105, name: 'Maya Haddad', email: 'maya@example.com', walletBalance: null };
}

describe('payerName', () => {
  const customer = { id: 105, name: '', email: 'maya@example.com', walletBalance: null };

  it('names a merchant account by its company, a store balance’s account by its name, else by the masked email', () => {
    expect(
      payerName({
        client: { id: 3, name: 'Phone Doctor FZE', group: null, walletBalance: null },
        customer: null,
      }),
    ).toBe('Phone Doctor FZE');
    expect(payerName({ client: null, customer: { ...customer, name: 'Maya Haddad' } })).toBe('Maya Haddad');
    expect(payerName({ client: null, customer })).toBe('ma•••@example.com');
    expect(payerName({ client: null, customer: null })).toBe('–');
  });
});

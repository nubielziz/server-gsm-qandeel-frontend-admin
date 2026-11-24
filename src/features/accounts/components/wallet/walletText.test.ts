// Tests for the words of the Financial and Statement parts: the kind of wallet, the hold line, the second-approver rule and the signed amount.
import { describe, expect, it } from 'vitest';
import {
  approverText,
  holdMailText,
  holdText,
  isNegative,
  kindText,
  liftRefusalText,
  longDay,
  signedAmount,
} from './walletText';

describe('kindText', () => {
  it('says what each wallet is for', () => {
    expect(kindText('merchant')).toBe('Merchant wallet: orders are held and settled from it');
    expect(kindText('store')).toBe('Store balance: spent at checkout');
  });
});

describe('holdMailText and liftRefusalText', () => {
  it('says a customer is emailed about a hold and a merchant is not', () => {
    expect(holdMailText('store')).toBe('The person is emailed.');
    expect(holdMailText('merchant')).toBe('The merchant is not emailed.');
  });

  it('names a negative balance as a reason to stay on hold for a store balance only; an open dispute is a reason for both', () => {
    expect(liftRefusalText('store')).toBe(
      'Refused while the balance is below zero or a dispute of one of their top-ups is open.',
    );
    expect(liftRefusalText('merchant')).toBe('Refused while a dispute of one of their top-ups is open.');
  });
});

describe('longDay', () => {
  it('writes a day with its year, and nothing for a missing or unreadable time', () => {
    expect(longDay('2026-11-02T12:00:00.000Z')).toBe('2 Nov 2026');
    expect(longDay(null)).toBe('');
    expect(longDay('later')).toBe('');
  });
});

describe('holdText', () => {
  it('names the day and the reason', () => {
    expect(holdText({ at: '2026-11-02T12:00:00.000Z', reason: ' Checking a disputed top-up ' })).toBe(
      'On hold since 2 Nov 2026: Checking a disputed top-up',
    );
  });

  it('drops the parts it does not have', () => {
    expect(holdText({ at: 'later', reason: '' })).toBe('On hold');
    expect(holdText({ at: '2026-11-02T12:00:00.000Z', reason: '' })).toBe('On hold since 2 Nov 2026');
  });
});

describe('approverText', () => {
  it('states the limit the server sent', () => {
    expect(approverText('10000.0000')).toBe('Adjustments above $10,000.00 need a second approver');
  });
});

describe('signedAmount and isNegative', () => {
  it('writes money in as +$ and money out as -$', () => {
    expect(signedAmount('25.0000')).toEqual({ text: '+$25.00', direction: 'in' });
    expect(signedAmount('-1234.5000')).toEqual({ text: '-$1,234.50', direction: 'out' });
    expect(signedAmount('0.0000')).toEqual({ text: '$0.00', direction: 'none' });
  });

  it('knows a balance below zero', () => {
    expect(isNegative('-81.9500')).toBe(true);
    expect(isNegative('0.0000')).toBe(false);
    expect(isNegative('12.0000')).toBe(false);
  });
});

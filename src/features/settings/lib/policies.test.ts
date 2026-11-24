// Tests for the policy rows, how the values are read from the settings and the server's message for one policy.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { isSwitchPolicy, policiesOf, policyMessage, POLICY_ROWS, wholeNumber } from './policies';

describe('the rows', () => {
  it('has five policies of the demo’s eight, four switches and one number', () => {
    expect(POLICY_ROWS).toHaveLength(5);
    expect(POLICY_ROWS.filter((row) => isSwitchPolicy(row.key))).toHaveLength(4);
    expect(POLICY_ROWS.filter((row) => row.unit)).toHaveLength(1);
  });

  it('has no row for the reminder at checkout, the IMEI check before payment or how long its log was kept', () => {
    const keys = POLICY_ROWS.map((row) => row.key as string);
    expect(keys).not.toContain('abandonedMinutes');
    expect(keys).not.toContain('imeiPrecheck');
    expect(keys).not.toContain('imeiRetentionDays');
  });
});

describe('policiesOf', () => {
  it('reads each policy with the right type and drops the rest', () => {
    const values = policiesOf({
      guestCheckout: true,
      require3ds: 'yes',
      refundHoursBeforeDispatch: 24,
      abandonedMinutes: 60,
      adminAllowlistOnly: true,
    });
    expect(values).toEqual({ guestCheckout: true, refundHoursBeforeDispatch: 24 });
    expect(policiesOf(undefined)).toEqual({});
  });

  it('ignores the two policies an older server still sends', () => {
    expect(policiesOf({ guestCheckout: true, imeiPrecheck: true, imeiRetentionDays: 180 })).toEqual({
      guestCheckout: true,
    });
  });
});

describe('wholeNumber', () => {
  it('takes digits only', () => {
    expect(wholeNumber(' 24 ')).toBe(24);
    expect(wholeNumber('0')).toBe(0);
    expect(wholeNumber('1.5')).toBeNull();
    expect(wholeNumber('-3')).toBeNull();
    expect(wholeNumber('')).toBeNull();
  });
});

describe('policyMessage', () => {
  const error = new ApiError({
    status: 422,
    code: 'VALIDATION_FAILED',
    title: 'Check the form',
    detail: 'Some fields need attention.',
    fieldErrors: { 'policies.refundHoursBeforeDispatch': ['Enter 0 to 72 hours.'] },
  });

  it('prefers the message under the policy’s own name, with or without a prefix', () => {
    expect(policyMessage(error, 'refundHoursBeforeDispatch')).toBe('Enter 0 to 72 hours.');
  });

  it('falls back to the problem’s detail and then to a plain error', () => {
    expect(policyMessage(error, 'guestCheckout')).toBe('Some fields need attention.');
    expect(policyMessage(new Error('Offline'), 'guestCheckout')).toBe('Offline');
    expect(policyMessage('x', 'guestCheckout')).toBe('The setting was not saved.');
  });
});

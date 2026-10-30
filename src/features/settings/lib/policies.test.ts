// Tests for the policy rows, how the values are read from the settings and the server's message for one policy.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { isSwitchPolicy, policiesOf, policyMessage, POLICY_ROWS, wholeNumber } from './policies';

describe('the rows', () => {
  it('has the demo’s eight policies, five switches and three numbers', () => {
    expect(POLICY_ROWS).toHaveLength(8);
    expect(POLICY_ROWS.filter((row) => isSwitchPolicy(row.key))).toHaveLength(5);
    expect(POLICY_ROWS.filter((row) => row.unit)).toHaveLength(3);
  });
});

describe('policiesOf', () => {
  it('reads each policy with the right type and drops the rest', () => {
    const values = policiesOf({
      guestCheckout: true,
      require3ds: 'yes',
      imeiRetentionDays: 180,
      abandonedMinutes: true,
      adminAllowlistOnly: true,
    });
    expect(values).toEqual({ guestCheckout: true, imeiRetentionDays: 180 });
    expect(policiesOf(undefined)).toEqual({});
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
    expect(policyMessage(error, 'abandonedMinutes')).toBe('Some fields need attention.');
    expect(policyMessage(new Error('Offline'), 'abandonedMinutes')).toBe('Offline');
    expect(policyMessage('x', 'abandonedMinutes')).toBe('The setting was not saved.');
  });
});

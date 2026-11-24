// Tests for the words and rules of the sessions tab: how a subject reads, the "Who" filter and what ending a session needs.
import { describe, expect, it } from 'vitest';
import { endPermissionOf, SESSION_WHO_ITEMS, subjectFilterOf, SUBJECT_LABEL } from './sessions';

describe('SUBJECT_LABEL', () => {
  it('reads the wire word account as "Account" and staff as "Staff"', () => {
    expect(SUBJECT_LABEL).toEqual({ staff: 'Staff', account: 'Account' });
  });
});

describe('SESSION_WHO_ITEMS and subjectFilterOf', () => {
  it('offers All, Staff and Account, in that order', () => {
    expect(SESSION_WHO_ITEMS.map((item) => [item.value, item.label])).toEqual([
      ['all', 'All'],
      ['staff', 'Staff'],
      ['account', 'Account'],
    ]);
  });

  it('sends no filter for both kinds, and the subject type for one', () => {
    expect(subjectFilterOf('all')).toBeUndefined();
    expect(subjectFilterOf('staff')).toEqual({ subjectType: 'staff' });
    expect(subjectFilterOf('account')).toEqual({ subjectType: 'account' });
  });
});

describe('endPermissionOf', () => {
  it('asks clients:security for the session of an account and nothing more for a staff session', () => {
    expect(endPermissionOf({ subjectType: 'account' })).toBe('clients:security');
    expect(endPermissionOf({ subjectType: 'staff' })).toBeUndefined();
  });
});

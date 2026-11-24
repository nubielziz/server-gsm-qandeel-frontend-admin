// Tests for the words of an account's status: a word and a tone for each, the precedence of the account's facts, and the fallback for a
// word the console does not know.
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_STATUSES,
  accountStatusLook,
  isAccountStatus,
  rawLabel,
  STATUS_LOOK,
  statusLook,
} from './status';

describe('status words', () => {
  it('gives each status a word and a tone', () => {
    expect(Object.entries(STATUS_LOOK).map(([status, look]) => [status, look.word])).toEqual([
      ['active', 'Active'],
      ['suspended', 'Suspended'],
      ['blocked', 'Blocked'],
      ['anonymized', 'Anonymized'],
    ]);
    expect(STATUS_LOOK.blocked.tone).toBe('crit');
    expect(STATUS_LOOK.suspended.tone).toBe('warn');
    expect(STATUS_LOOK.anonymized.tone).toBe('off');
    expect(ACCOUNT_STATUSES).toEqual(['active', 'suspended', 'blocked', 'anonymized']);
  });

  it('knows a status from a word in an address, and the retired words are not statuses', () => {
    expect(isAccountStatus('blocked')).toBe(true);
    expect(isAccountStatus('pending')).toBe(false);
    expect(isAccountStatus('constructor')).toBe(false);
  });

  it('gives a status it does not know an off square with its raw value, and the known ones their own', () => {
    expect(statusLook('blocked')).toBe(STATUS_LOOK.blocked);
    expect(statusLook('pending_review')).toEqual({ word: 'pending_review', tone: 'off' });
    // Names on the prototype chain are not statuses.
    expect(statusLook('constructor')).toEqual({ word: 'constructor', tone: 'off' });
    expect(statusLook('')).toEqual({ word: 'Unknown', tone: 'off' });
    expect(statusLook(undefined)).toEqual({ word: 'Unknown', tone: 'off' });
  });

  it('reads an empty or missing value as "Unknown"', () => {
    expect(rawLabel('pending_review')).toBe('pending_review');
    expect(rawLabel('')).toBe('Unknown');
    expect(rawLabel('   ')).toBe('Unknown');
    expect(rawLabel(undefined)).toBe('Unknown');
    expect(rawLabel(null)).toBe('Unknown');
  });
});

describe('accountStatusLook', () => {
  const base = { status: 'active' as const, hasAccount: true, invitationPending: false };

  it('says Active for an active account with a login and a password', () => {
    expect(accountStatusLook(base)).toEqual({ word: 'Active', tone: 'ok' });
  });

  it('puts anonymized, blocked and suspended before everything else', () => {
    expect(accountStatusLook({ ...base, status: 'anonymized', hasAccount: false })).toEqual(
      STATUS_LOOK.anonymized,
    );
    expect(accountStatusLook({ ...base, status: 'blocked', hasAccount: false })).toEqual(STATUS_LOOK.blocked);
    expect(accountStatusLook({ ...base, status: 'suspended', invitationPending: true })).toEqual(
      STATUS_LOOK.suspended,
    );
  });

  it('says Guest for a record with no login and Invitation pending for one that has not chosen a password', () => {
    expect(accountStatusLook({ ...base, hasAccount: false })).toEqual({ word: 'Guest', tone: 'off' });
    expect(accountStatusLook({ ...base, invitationPending: true })).toEqual({
      word: 'Invitation pending',
      tone: 'warn',
    });
  });

  it('shows the raw word of a status of the old model, never a banner', () => {
    expect(accountStatusLook({ ...base, status: 'pending' as never })).toEqual({
      word: 'pending',
      tone: 'off',
    });
    expect(accountStatusLook({ ...base, status: '' as never })).toEqual({ word: 'Unknown', tone: 'off' });
  });
});

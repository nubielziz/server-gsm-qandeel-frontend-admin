// Tests for the words and figures of admin accounts (ports of adminJoinText, adminPwText and the stat strip).
import { describe, expect, it } from 'vitest';
import { devicesText, joinText, passwordText, sessionsText, staffFigures, statusNote } from './staffText';
import { member } from '@/test/fixtures/accessRows';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;

const invited = member({
  status: 'invited',
  twofaEnabled: false,
  lastLoginAt: null,
  passwordChangedAt: null,
});

describe('joinText', () => {
  it('is empty for an account that has signed in', () => {
    expect(joinText(member(), NOW)).toBe('');
  });

  it('says when the invitation link was sent and that it works for an hour', () => {
    expect(joinText({ ...invited, resetSentAt: ago(10 * MIN) }, NOW)).toBe(
      'Invitation link sent 10m ago. It works for 1 hour.',
    );
  });

  it('says the link expired after an hour', () => {
    expect(joinText({ ...invited, resetSentAt: ago(90 * MIN) }, NOW)).toBe(
      'The invitation link expired. Send a new one from Password.',
    );
  });

  it('describes a temporary password', () => {
    expect(joinText({ ...invited, passwordChangedAt: ago(5 * MIN), mustChangePassword: true }, NOW)).toBe(
      'Temporary password set 5m ago. They must change it and set up 2FA at first sign-in.',
    );
  });

  it('still says something useful when the server does not tell when the link went out', () => {
    expect(joinText(invited, NOW)).toContain('invitation was sent');
  });
});

describe('passwordText', () => {
  it('describes an invited account by what it has', () => {
    expect(passwordText(invited, NOW)).toEqual({ text: 'Not chosen yet', warn: false });
    expect(passwordText({ ...invited, passwordChangedAt: ago(MIN) }, NOW)).toEqual({
      text: 'Temporary, change required',
      warn: false,
    });
  });

  it('shows an open reset link, newer than the last change', () => {
    const reset = member({ passwordChangedAt: ago(48 * 60 * MIN), resetSentAt: ago(5 * MIN) });
    expect(passwordText(reset, NOW)).toEqual({ text: 'Reset link sent 5m ago', warn: false });
  });

  it('warns about a temporary password that still has to be replaced', () => {
    expect(passwordText(member({ mustChangePassword: true }), NOW)).toEqual({
      text: 'Temporary, change required at next sign-in',
      warn: true,
    });
  });

  it('says when the password was last changed', () => {
    expect(passwordText(member({ passwordChangedAt: ago(3 * 60 * MIN) }), NOW)).toEqual({
      text: 'Changed 3h ago',
      warn: false,
    });
    expect(passwordText(member({ passwordChangedAt: null }), NOW).text).toBe('Not changed yet');
  });
});

describe('statusNote', () => {
  it('gives the reason of a suspension, before any note after the colon', () => {
    expect(statusNote(member({ status: 'suspended', suspendedReason: 'On leave: back in March' }), NOW)).toBe(
      'On leave',
    );
  });

  it('describes how an invited account will join', () => {
    expect(statusNote({ ...invited, resetSentAt: ago(10 * MIN) }, NOW)).toBe('Link sent 10m ago');
    expect(statusNote({ ...invited, resetSentAt: ago(2 * 60 * MIN) }, NOW)).toBe('Link expired');
    expect(statusNote({ ...invited, passwordChangedAt: ago(MIN) }, NOW)).toBe('Temporary password');
  });

  it('is empty for an active account', () => {
    expect(statusNote(member(), NOW)).toBe('');
  });
});

describe('staffFigures', () => {
  it('counts active, signed in, waiting, suspended and 2FA among the active', () => {
    const staff = [
      member({ id: 1, activeSessions: 2 }),
      member({ id: 2, activeSessions: 0, twofaEnabled: false }),
      member({ id: 3, status: 'invited', twofaEnabled: false, activeSessions: 0 }),
      member({ id: 4, status: 'suspended', activeSessions: 0 }),
    ];
    expect(staffFigures(staff)).toEqual({ active: 2, signedIn: 1, waiting: 1, suspended: 1, twofaOn: 1 });
  });
});

describe('plurals', () => {
  it('counts devices and sessions', () => {
    expect(devicesText(1)).toBe('1 device');
    expect(devicesText(3)).toBe('3 devices');
    expect(sessionsText(1)).toBe('1 session');
    expect(sessionsText(2)).toBe('2 sessions');
  });
});

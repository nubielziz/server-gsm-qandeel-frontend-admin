// Tests for the words of the Security part: the devices, the Password row and the note under it while a link is open, the Link and
// Verification lines, the last sign-in, the address "Last seen from" and the audience it is blocked for. Ports the devices, password and
// last-seen cases of the old customers' text tests, in the words of this layout.
import { describe, expect, it } from 'vitest';
import { account, guest, merchantAccount } from '../../test/fixtures';
import {
  blockIpNote,
  dayText,
  devicesText,
  LAST_SEEN_SCOPE,
  lastSeenIp,
  lastSignIn,
  linkText,
  passwordText,
  signedInText,
  verificationText,
} from './securityText';

const NOW = Date.parse('2026-01-10T12:00:00.000Z');
const security = account().security!;

describe('devicesText', () => {
  it('counts devices in words', () => {
    expect(devicesText(1)).toBe('1 device');
    expect(devicesText(0)).toBe('0 devices');
    expect(devicesText(3)).toBe('3 devices');
  });
});

describe('signedInText', () => {
  it('says how many devices are signed in and that they must sign in again', () => {
    expect(signedInText(1)).toBe('1 device is signed in. They must sign in again.');
    expect(signedInText(3)).toBe('3 devices are signed in. They must sign in again.');
  });

  it('says so when no device is signed in', () => {
    expect(signedInText(0)).toMatch(/^No device is signed in/);
  });
});

describe('passwordText', () => {
  it('says "Set" for an account with a password it chose', () => {
    expect(passwordText(security)).toEqual({ text: 'Set', warn: false });
  });

  it('says "Not set yet (invitation)" for an account that never chose one', () => {
    expect(passwordText({ ...security, hasPassword: false })).toEqual({
      text: 'Not set yet (invitation)',
      warn: false,
    });
  });

  it('flags a temporary password that has not been replaced yet', () => {
    expect(passwordText({ ...security, mustChangePassword: true })).toEqual({
      text: 'Temporary (must change at next sign-in)',
      warn: true,
    });
  });

  it('says an invitation is open before any password, and a reset link after one', () => {
    const open = { linkSentAt: '2026-01-10T11:00:00.000Z' };
    expect(passwordText({ ...security, ...open, hasPassword: false }).note).toBe(
      'An invitation link is open.',
    );
    expect(passwordText({ ...security, ...open }).note).toBe('A reset link is open.');
  });

  it('says no more while no link is open', () => {
    expect(passwordText({ ...security, linkSentAt: null }).note).toBeUndefined();
  });

  it('warns that a temporary password still works while a link is open', () => {
    const words = passwordText({
      ...security,
      mustChangePassword: true,
      linkSentAt: '2026-01-10T11:00:00.000Z',
    });
    expect(words.text).toBe('Temporary (must change at next sign-in)');
    expect(words.warn).toBe(true);
    expect(words.note).toBe('A reset link is open. A temporary password still works while a link is open.');
  });
});

describe('linkText and verificationText', () => {
  it('says when the newest open link went out and how long it works', () => {
    expect(linkText({ linkSentAt: '2026-01-10T11:00:00.000Z' }, NOW)).toBe(
      'Link sent 1h ago, works for 1 hour',
    );
    expect(linkText({ linkSentAt: '2026-01-10T11:30:00.000Z' }, NOW)).toBe(
      'Link sent 30m ago, works for 1 hour',
    );
  });

  it('says nothing when no link is open', () => {
    expect(linkText({ linkSentAt: null }, NOW)).toBeNull();
    expect(verificationText({ verificationSentAt: null }, NOW)).toBeNull();
  });

  it('says when the verification email went out', () => {
    expect(verificationText({ verificationSentAt: '2026-01-10T10:00:00.000Z' }, NOW)).toBe(
      'Verification sent 2h ago',
    );
  });
});

describe('lastSignIn', () => {
  it('gives the age and the address of the last sign-in', () => {
    expect(lastSignIn({ lastLoginAt: '2026-01-07T12:00:00.000Z', lastLoginIp: '203.0.113.9' }, NOW)).toEqual({
      age: '3d ago',
      ip: '203.0.113.9',
    });
  });

  it('keeps an unknown address as null', () => {
    expect(lastSignIn({ lastLoginAt: '2026-01-10T11:59:50.000Z', lastLoginIp: null }, NOW)).toEqual({
      age: 'just now',
      ip: null,
    });
  });

  it('has neither for an account that never signed in', () => {
    expect(lastSignIn({ lastLoginAt: null, lastLoginIp: '203.0.113.9' }, NOW)).toEqual({
      age: null,
      ip: null,
    });
  });
});

describe('lastSeenIp', () => {
  it('uses the address of the last sign-in', () => {
    expect(lastSeenIp(account())).toBe('203.0.113.177');
  });

  it('is null when nothing says where the account came from', () => {
    expect(lastSeenIp(account({ security: { ...security, lastLoginIp: null } }))).toBeNull();
    expect(lastSeenIp(guest())).toBeNull();
    expect(lastSeenIp({ security: null })).toBeNull();
  });
});

describe('blockIpNote', () => {
  it('tells a merchant rank that a shop block leaves the open session and the API working, and says what stops them', () => {
    const note = blockIpNote(merchantAccount());
    expect(note).toMatch(/new shop sign-ins only/);
    expect(note).toMatch(/already signed in/);
    expect(note).toMatch(/API/);
    expect(note).toMatch(/Everywhere/);
    expect(note).toMatch(/Sign out everywhere/);
  });

  it('says nothing for a retail rank, whose shop session the block does stop', () => {
    expect(blockIpNote(account())).toBeNull();
    expect(blockIpNote(guest())).toBeNull();
  });
});

describe('LAST_SEEN_SCOPE', () => {
  it('is the shop, whatever the rank: the sessions of this part are browser sessions', () => {
    expect(LAST_SEEN_SCOPE).toBe('store');
  });
});

describe('dayText', () => {
  it('writes a day as people do', () => {
    expect(dayText('2026-03-03T12:00:00.000Z')).toBe('3 Mar 2026');
  });

  it('gives nothing for a value it cannot read', () => {
    expect(dayText(null)).toBe('');
    expect(dayText('not a date')).toBe('');
  });
});

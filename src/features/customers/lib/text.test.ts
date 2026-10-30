// Tests for the words and figures of the customer screens: how a customer came to us, the password line, the address shown as
// "Last seen from", the consent record labels and the zero-spend test.
import { describe, expect, it } from 'vitest';
import { customer, customerDetail } from '../test/fixtures';
import {
  consentLabel,
  createdByText,
  customerSince,
  devicesText,
  isZeroMoney,
  lastSeenIp,
  passwordText,
} from './text';

const NOW = Date.parse('2026-01-10T12:00:00.000Z');
const account = customerDetail().account!;

describe('createdByText', () => {
  it('reads a staff id as "added by your team", whatever the account', () => {
    expect(createdByText({ createdBy: 3, hasAccount: true })).toBe('Added by your team');
  });

  it('reads no creator as a sign-up for an account and a purchase for a guest', () => {
    expect(createdByText({ createdBy: null, hasAccount: true })).toBe('Signed up on the storefront');
    expect(createdByText({ createdBy: null, hasAccount: false })).toBe('Bought as a guest');
  });
});

describe('devicesText', () => {
  it('counts devices in words', () => {
    expect(devicesText(1)).toBe('1 device');
    expect(devicesText(0)).toBe('0 devices');
    expect(devicesText(3)).toBe('3 devices');
  });
});

describe('passwordText', () => {
  it('says when the password was changed', () => {
    expect(passwordText({ ...account, passwordChangedAt: '2026-01-07T12:00:00.000Z' }, NOW)).toEqual({
      text: 'Changed 3d ago',
      warn: false,
    });
  });

  it('says "not chosen yet" for an account that has no password and no link', () => {
    expect(passwordText({ ...account, passwordChangedAt: null }, NOW)).toEqual({
      text: 'Not chosen yet',
      warn: false,
    });
  });

  it('flags a temporary password that has not been replaced yet', () => {
    expect(passwordText({ ...account, mustChangePassword: true }, NOW)).toEqual({
      text: 'Temporary, they must change it at next sign-in',
      warn: true,
    });
  });

  it('reports an open link: an invitation before any password, a reset after one', () => {
    expect(
      passwordText({ ...account, passwordChangedAt: null, resetSentAt: '2026-01-10T11:00:00.000Z' }, NOW)
        .text,
    ).toBe('Invite link sent 1h ago');
    expect(
      passwordText(
        {
          ...account,
          passwordChangedAt: '2026-01-01T12:00:00.000Z',
          resetSentAt: '2026-01-10T11:30:00.000Z',
        },
        NOW,
      ).text,
    ).toBe('Reset link sent 30m ago');
  });

  it('warns that a temporary password still works while a link is open', () => {
    const text = passwordText(
      {
        ...account,
        mustChangePassword: true,
        passwordChangedAt: '2026-01-05T12:00:00.000Z',
        resetSentAt: '2026-01-10T11:00:00.000Z',
      },
      NOW,
    );
    expect(text.text).toBe('Reset link sent 1h ago');
    expect(text.note).toBe('Their temporary password still works until they use the link');
  });

  it('reports the password as changed once it is newer than the link', () => {
    expect(
      passwordText(
        {
          ...account,
          passwordChangedAt: '2026-01-09T12:00:00.000Z',
          resetSentAt: '2026-01-08T12:00:00.000Z',
        },
        NOW,
      ).text,
    ).toBe('Changed 1d ago');
  });
});

describe('lastSeenIp', () => {
  const consents = {
    orderId: 5,
    records: [{ purpose: 'terms', document: null, at: '2026-01-01T00:00:00.000Z', ip: '192.0.2.77' }],
  };

  it('uses the address of the last session for an account', () => {
    expect(lastSeenIp(customerDetail({ latestConsents: consents }))).toBe('203.0.113.177');
  });

  it('falls back to the address of the latest consent record for a guest', () => {
    expect(lastSeenIp(customerDetail({ account: null, latestConsents: consents }))).toBe('192.0.2.77');
  });

  it('is null when nothing says where the customer came from', () => {
    expect(lastSeenIp(customerDetail({ account: null, latestConsents: null }))).toBeNull();
    expect(
      lastSeenIp(customerDetail({ account: { ...account, lastIp: null }, latestConsents: null })),
    ).toBeNull();
  });
});

describe('customerSince', () => {
  it('keeps the day and month, not the time', () => {
    expect(customerSince(customer().createdAt)).toMatch(/^\d{2} [A-Z][a-z]{2,3}$/);
  });
});

describe('consentLabel', () => {
  it('shows the document with its version when the record has one', () => {
    expect(consentLabel({ purpose: 'terms', document: 'Terms of service v3.2' })).toBe(
      'Terms of service v3.2',
    );
  });

  it('says the purpose in the demo’s words when there is no document', () => {
    expect(consentLabel({ purpose: 'withdrawal_waiver', document: null })).toBe(
      'Digital service starts now, right of withdrawal is waived',
    );
    expect(consentLabel({ purpose: 'marketing', document: null })).toBe('Marketing emails (opt-in)');
    expect(consentLabel({ purpose: 'terms', document: null })).toBe('Terms of service');
  });

  it('shows a purpose it does not know as readable text', () => {
    expect(consentLabel({ purpose: 'cookie_banner', document: null })).toBe('Cookie banner');
  });
});

describe('isZeroMoney', () => {
  it('is true only for an amount of exactly zero', () => {
    expect(isZeroMoney('0.0000')).toBe(true);
    expect(isZeroMoney('0')).toBe(true);
    expect(isZeroMoney('0.0001')).toBe(false);
    expect(isZeroMoney('38.3700')).toBe(false);
  });
});

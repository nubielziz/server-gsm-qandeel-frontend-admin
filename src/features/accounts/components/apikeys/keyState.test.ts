// Tests for the state of an API key, its permissions as the list prints them (the addresses, the day it is valid until, expired or not) and the
// lock of "Generate API key" and "Key with limits…": revoked beats expired beats active, the words of each state, and the order in which the
// permission, the Owner rule and the account's status decide why a new key is off.
import { describe, expect, it } from 'vitest';
import { ACCOUNT_TEST_ROLES } from '../../test/roles';
import { buildGrants } from '../frame/useAccountGrants';
import {
  apiKeyState,
  KEY_LOOK,
  keyPermissions,
  NEW_KEY_NOT_ACTIVE,
  permissionsLine,
  NEW_KEY_OWNER_ONLY,
  newKeyLock,
} from './keyState';

describe('apiKeyState', () => {
  const now = Date.parse('2026-06-01T00:00:00.000Z');

  it('is revoked once revokedAt is set, expired once expiresAt has passed, and active otherwise', () => {
    expect(apiKeyState({ revokedAt: null, expiresAt: null }, now)).toBe('active');
    expect(apiKeyState({ revokedAt: '2026-05-01T00:00:00.000Z', expiresAt: null }, now)).toBe('revoked');
    expect(apiKeyState({ revokedAt: null, expiresAt: '2026-05-01T00:00:00.000Z' }, now)).toBe('expired');
    expect(apiKeyState({ revokedAt: null, expiresAt: '2026-07-01T00:00:00.000Z' }, now)).toBe('active');
  });

  it('calls a key that is both revoked and past its day revoked', () => {
    expect(
      apiKeyState({ revokedAt: '2026-05-01T00:00:00.000Z', expiresAt: '2026-05-02T00:00:00.000Z' }, now),
    ).toBe('revoked');
  });

  it('reads an expiry that is exactly now as expired', () => {
    expect(apiKeyState({ revokedAt: null, expiresAt: '2026-06-01T00:00:00.000Z' }, now)).toBe('expired');
  });
});

describe('keyPermissions', () => {
  const now = Date.parse('2026-06-01T00:00:00.000Z');
  // The list prints the day in the machine's own zone, so an end is noon of its day there (a fixed UTC time moves a day in some zones).
  const key = {
    allowedIps: [] as string[],
    expiresAt: null as string | null,
    revokedAt: null as string | null,
  };

  it('is any address and no end for a key with neither', () => {
    expect(keyPermissions(key, now)).toEqual({ addresses: [], validUntil: 'No end', expired: false });
  });

  it('lists the addresses and the day the key is valid until', () => {
    expect(
      keyPermissions(
        {
          ...key,
          allowedIps: ['203.0.113.55', '198.51.100.0/24'],
          expiresAt: new Date(2026, 11, 31, 12).toISOString(),
        },
        now,
      ),
    ).toEqual({
      addresses: ['203.0.113.55', '198.51.100.0/24'],
      validUntil: 'Valid until 31 Dec 2026',
      expired: false,
    });
  });

  it('marks a key whose end has passed, and keeps the day it ended on', () => {
    expect(keyPermissions({ ...key, expiresAt: new Date(2026, 4, 1, 12).toISOString() }, now)).toMatchObject({
      validUntil: 'Valid until 01 May 2026',
      expired: true,
    });
  });

  it('does not call a revoked key expired, and reads an end that cannot be read as no end', () => {
    expect(
      keyPermissions(
        { ...key, expiresAt: '2026-05-01T12:00:00.000Z', revokedAt: '2026-05-10T00:00:00.000Z' },
        now,
      ).expired,
    ).toBe(false);
    expect(keyPermissions({ ...key, expiresAt: 'not a time' }, now).validUntil).toBe('No end');
  });
});

describe('permissionsLine', () => {
  it('reads the addresses, or Any address, then the day, with Expired after it for a key whose end has passed', () => {
    expect(permissionsLine({ addresses: [], validUntil: 'No end', expired: false })).toBe(
      'Any address · No end',
    );
    expect(
      permissionsLine({
        addresses: ['203.0.113.55', '198.51.100.0/24'],
        validUntil: 'Valid until 31 Dec 2026',
        expired: false,
      }),
    ).toBe('203.0.113.55, 198.51.100.0/24 · Valid until 31 Dec 2026');
    expect(permissionsLine({ addresses: [], validUntil: 'Valid until 01 May 2026', expired: true })).toBe(
      'Any address · Valid until 01 May 2026 · Expired',
    );
  });
});

describe('KEY_LOOK', () => {
  it('draws active as a filled square, expired as a warning and revoked as a hollow one, each with its word', () => {
    expect(KEY_LOOK).toEqual({
      active: { tone: 'ok', word: 'Active' },
      expired: { tone: 'warn', word: 'Expired' },
      revoked: { tone: 'off', word: 'Revoked' },
    });
  });
});

describe('newKeyLock', () => {
  const owner = buildGrants([...ACCOUNT_TEST_ROLES.owner]);
  const manager = buildGrants([...ACCOUNT_TEST_ROLES.manager]);
  const reader = buildGrants(['clients:read', 'api_keys:read']);

  it('is open for the Owner and an active account', () => {
    expect(newKeyLock(owner, 'active')).toEqual({ disabled: false });
  });

  it('names the Owner rule for a role that has the permission but is not the Owner', () => {
    expect(newKeyLock(manager, 'active')).toEqual({ disabled: true, title: NEW_KEY_OWNER_ONLY });
  });

  it('names the missing permission before the Owner rule', () => {
    expect(newKeyLock(reader, 'active')).toEqual({
      disabled: true,
      title: 'You need the api_keys:create permission',
    });
  });

  it('asks for a reactivation when the account is not active, for every status but active', () => {
    for (const status of ['suspended', 'blocked', 'anonymized'] as const) {
      expect(newKeyLock(owner, status)).toEqual({ disabled: true, title: NEW_KEY_NOT_ACTIVE });
    }
  });

  it('tells a non-Owner about the Owner rule before the status of the account', () => {
    expect(newKeyLock(manager, 'suspended').title).toBe(NEW_KEY_OWNER_ONLY);
  });
});

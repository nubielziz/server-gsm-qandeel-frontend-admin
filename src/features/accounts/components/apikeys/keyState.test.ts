// Tests for the state of an API key and the lock of "New key…": revoked beats expired beats active, the words of each state, and the order
// in which the permission, the Owner rule and the account's status decide why a new key is off.
import { describe, expect, it } from 'vitest';
import { ACCOUNT_TEST_ROLES } from '../../test/roles';
import { buildGrants } from '../frame/useAccountGrants';
import { apiKeyState, KEY_LOOK, NEW_KEY_NOT_ACTIVE, NEW_KEY_OWNER_ONLY, newKeyLock } from './keyState';

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

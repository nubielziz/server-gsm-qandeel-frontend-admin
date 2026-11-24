// What state an API key is in and who may make a new one, for the API part. Display and hints only: the server refuses a revoked or
// expired key, a key for an account that is not active, and a key made by anyone but the Owner.
import type { SquareTone } from '@/components/ui';
import type { AccountStatus, ApiKey } from '../../types';
import type { AccountGrants, GrantLock } from '../frame/useAccountGrants';

/** Where a key stands: working, past its expiry day, or switched off by staff or its owner. */
export type ApiKeyState = 'active' | 'expired' | 'revoked';

/** A key is revoked once `revokedAt` is set, expired once `expiresAt` has passed, and active otherwise. */
export function apiKeyState(key: Pick<ApiKey, 'revokedAt' | 'expiresAt'>, now: number): ApiKeyState {
  if (key.revokedAt) return 'revoked';
  if (key.expiresAt && Date.parse(key.expiresAt) <= now) return 'expired';
  return 'active';
}

/** The square and the word of each state (an off square is hollow, so the state is never colour alone). */
export const KEY_LOOK: Readonly<Record<ApiKeyState, { tone: SquareTone; word: string }>> = {
  active: { tone: 'ok', word: 'Active' },
  expired: { tone: 'warn', word: 'Expired' },
  revoked: { tone: 'off', word: 'Revoked' },
};

/** The title of "New key…" for a staff member who is not the Owner. */
export const NEW_KEY_OWNER_ONLY = 'Only the Owner creates a key from the console';

/** The title of "New key…" for an account that is not active. */
export const NEW_KEY_NOT_ACTIVE = 'Reactivate the account first: only an active account can have keys';

/**
 * The lock of "New key…": the `api_keys:create` permission, then the Owner rule, then an active account. The first rule that fails
 * gives the title, so a staff member is told the most basic thing that stops them.
 */
export function newKeyLock(grants: AccountGrants, status: AccountStatus): GrantLock {
  const permission = grants.needs('api_keys:create');
  if (permission.disabled) return permission;
  const owner = grants.ownerLock(NEW_KEY_OWNER_ONLY);
  if (owner.disabled) return owner;
  if (status !== 'active') return { disabled: true, title: NEW_KEY_NOT_ACTIVE };
  return { disabled: false };
}

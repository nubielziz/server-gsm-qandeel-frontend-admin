// What state an API key is in, for the badge in the API access tab. Display only: the server refuses a revoked or expired key.
import type { BadgeTone, IconName } from '@/components/ui';
import type { ApiKey } from '../types';

export type ApiKeyState = 'active' | 'revoked' | 'expired';

/** A key is revoked once `revokedAt` is set, expired once `expiresAt` has passed, and active otherwise. */
export function apiKeyState(key: Pick<ApiKey, 'revokedAt' | 'expiresAt'>, now: number): ApiKeyState {
  if (key.revokedAt) return 'revoked';
  if (key.expiresAt && Date.parse(key.expiresAt) <= now) return 'expired';
  return 'active';
}

export const KEY_BADGE: Readonly<Record<ApiKeyState, { tone: BadgeTone; icon: IconName; label: string }>> = {
  active: { tone: 'good', icon: 'checkCircle', label: 'Active' },
  revoked: { tone: 'crit', icon: 'ban', label: 'Revoked' },
  expired: { tone: 'neutral', icon: 'clock', label: 'Expired' },
};

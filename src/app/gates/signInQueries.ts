// Which cached queries survive arriving on a sign-in screen (used by PublicArea).
import type { Query } from '@tanstack/react-query';

/**
 * Queries the sign-in screens themselves depend on and must keep: Refine's "am I signed in?" answer (the sign-in area
 * watches it) and a sign-in API call that is still in flight (`['api', 'auth', …]`). React runs a page's effects
 * before this component's, so the 2FA setup request may already be on its way; removing it would drop the server's
 * secret. A finished one from an earlier visit is dropped like everything else, so no secret outlives its session.
 */
export function keepForSignIn(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  const [scope, area] = query.queryKey;
  if (scope === 'auth' && area === 'check') return true;
  return scope === 'api' && area === 'auth' && query.state.fetchStatus === 'fetching';
}

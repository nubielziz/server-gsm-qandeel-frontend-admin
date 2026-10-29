// The secret and QR code for first-time authenticator setup, requested when the setup screen opens.
import { useApiQuery } from '@/lib/query';
import { setupTwoFactor } from '../api';

/**
 * Asking for a setup starts a new one on the server, so this is a query that never refreshes by itself: one request
 * per visit of the screen (React Query shares the call between Strict Mode's double mount), no retries, and nothing
 * kept after the screen closes. `Retry` on the screen calls `refetch`. The request is not cancellable, because
 * cancelling a call that changes server state would leave the screen unsure which secret is current.
 * A 401 (no half-signed-in session) sends the user back to the sign-in screen through the auth provider.
 */
export function useTwoFactorSetup() {
  return useApiQuery({
    queryKey: ['api', 'auth', '2fa-setup'],
    queryFn: () => setupTwoFactor(),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Step 2 of sign-in: the authenticator code, used by the code screen and by the first-time setup screen.
import { useGo, useInvalidateAuthStore, useLogin } from '@refinedev/core';
import { useCallback } from 'react';
import type { TwoFactorBody } from '../types';
import { asError, failureOf, ignoreError } from './authFailure';
import { useDestination } from './useDestination';

/**
 * Runs the auth provider's `login` with `{ code }` through Refine's `useLogin`, which refreshes Refine's auth state.
 * On success it opens the page the user first asked for (`?to=`), or the home page. Refine's own redirect is replaced
 * because it trusts any `?to=` and because the cached "signed out" answer must be refreshed first, or the protected
 * route would still see nobody signed in and send the user back.
 */
export function useCodeStep() {
  const go = useGo();
  const invalidateAuthStore = useInvalidateAuthStore();
  const { destination } = useDestination();
  const { mutateAsync, isPending } = useLogin<TwoFactorBody>({
    mutationOptions: {
      onSuccess: async (result) => {
        if (!result.success) return;
        await invalidateAuthStore();
        go({ to: destination, type: 'replace' });
      },
      onError: ignoreError,
    },
  });

  /** Resolves with the failure to show, or undefined when the user is signed in. */
  const verify = useCallback(
    async (code: string): Promise<Error | undefined> => {
      try {
        return failureOf(await mutateAsync({ code }));
      } catch (thrown) {
        return asError(thrown);
      }
    },
    [mutateAsync],
  );

  return { verify, isPending };
}

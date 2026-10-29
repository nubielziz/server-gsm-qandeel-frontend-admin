// Sign out of the console: ends the session on the server, then the console's gate shows the sign-in screen.
import { useActiveAuthProvider, useNotification, type CheckResponse } from '@refinedev/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AUTH_PATHS } from '@/features/auth';
import { isApiError } from '@/lib/api';
import { errorToast } from '@/lib/query';

/** Refine's cache key of the "signed in?" check (`useIsAuthenticated`). */
const AUTH_CHECK_KEY = ['auth', 'check'];

// A failure toast with the server's title ("Server error"), not the error class name ("ApiError").
function failureToast(error: unknown) {
  if (isApiError(error)) return errorToast(error);
  return { message: 'Could not sign out', description: error instanceof Error ? error.message : undefined };
}

/**
 * `signOut()` runs the auth provider's `logout`. On success it marks the session as signed out, which sends the user
 * to the sign-in screen; if the server refuses, the user stays signed in and sees why.
 * Refine's `useLogout` is not used: its failure toast is titled with the error class ("ApiError") and, unlike
 * `useLogin`, it overwrites `mutationOptions.onSuccess`, so that toast cannot be replaced.
 */
export function useSignOut() {
  const auth = useActiveAuthProvider();
  const queryClient = useQueryClient();
  const { open } = useNotification();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await auth?.logout?.({})) ?? { success: true, redirectTo: AUTH_PATHS.login },
    onSuccess: async (result) => {
      if (result.success) {
        // Answer the "signed in?" check ourselves instead of navigating: the console's gate then sends the user to
        // the sign-in screen, and `logout` tells it this was a deliberate sign-out, so no `?to=` is added (the next
        // person lands on their own start page). Navigating from here raced with a late re-check of the session,
        // which could land on `/login?to=…`. A check still in flight is cancelled so it cannot overwrite the answer.
        await queryClient.cancelQueries({ queryKey: AUTH_CHECK_KEY });
        queryClient.setQueryData<CheckResponse>(AUTH_CHECK_KEY, {
          authenticated: false,
          redirectTo: result.redirectTo ?? AUTH_PATHS.login,
          logout: true,
        });
        // Identity and permissions belong to the old session.
        queryClient.removeQueries({
          queryKey: ['auth'],
          predicate: (query) => query.queryKey[1] !== 'check',
        });
      } else {
        open?.({ type: 'error', ...failureToast(result.error) });
      }
    },
    onError: (error) => open?.({ type: 'error', ...failureToast(error) }),
  });

  return { signOut: () => mutate(), isPending };
}

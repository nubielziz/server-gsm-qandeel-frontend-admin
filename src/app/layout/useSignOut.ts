// Sign out of the console: ends the session on the server, then goes to the sign-in screen.
import { useActiveAuthProvider, useGo, useNotification } from '@refinedev/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AUTH_PATHS } from '@/features/auth';
import { isApiError } from '@/lib/api';
import { errorToast } from '@/lib/query';

// A failure toast with the server's title ("Server error"), not the error class name ("ApiError").
function failureToast(error: unknown) {
  if (isApiError(error)) return errorToast(error);
  return { message: 'Could not sign out', description: error instanceof Error ? error.message : undefined };
}

/**
 * `signOut()` runs the auth provider's `logout`. On success it drops Refine's auth state and leaves for the sign-in
 * screen; if the server refuses, the user stays signed in and sees why.
 * Refine's `useLogout` is not used: its failure toast is titled with the error class ("ApiError") and, unlike
 * `useLogin`, it overwrites `mutationOptions.onSuccess`, so that toast cannot be replaced.
 */
export function useSignOut() {
  const auth = useActiveAuthProvider();
  const go = useGo();
  const queryClient = useQueryClient();
  const { open } = useNotification();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await auth?.logout?.({})) ?? { success: true, redirectTo: AUTH_PATHS.login },
    onSuccess: (result) => {
      if (result.success) {
        // Forget every auth answer before leaving: the "signed in?" check never refetches on its own
        // (src/app/queryClient.ts), so the sign-in screen must ask the server afresh instead of trusting the old
        // answer and bouncing the user straight back into the console.
        queryClient.removeQueries({ queryKey: ['auth'] });
        go({ to: result.redirectTo ?? AUTH_PATHS.login, type: 'replace' });
      } else {
        open?.({ type: 'error', ...failureToast(result.error) });
      }
    },
    onError: (error) => open?.({ type: 'error', ...failureToast(error) }),
  });

  return { signOut: () => mutate(), isPending };
}

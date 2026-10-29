// Step 1 of sign-in: email and password. On success it goes to the screen the server asked for (authenticator code,
// first-time setup or new password), keeping the `?to=` destination along.
import { useGo, useLogin } from '@refinedev/core';
import { useCallback } from 'react';
import { withDestination } from '../destination';
import type { LoginBody } from '../types';
import { asError, failureOf, ignoreError } from './authFailure';
import { useDestination } from './useDestination';

/**
 * Runs the auth provider's `login` through Refine's `useLogin`. Two things differ from its defaults:
 * - Refine would jump to `?to=` ahead of the next step, but after step 1 the user is only half signed in, so the
 *   next step comes first and `?to=` is passed on to it.
 * - A refusal is returned to the form instead of becoming a toast titled "ApiError".
 * (`useApiMutation` is not used here: it hands a wrong password's 401 to the auth provider's `onError`, which signs
 * out and rewrites the URL, losing `?to=`.)
 */
export function useCredentialsStep() {
  const go = useGo();
  const { to } = useDestination();
  const { mutateAsync, isPending } = useLogin<LoginBody>({
    mutationOptions: {
      onSuccess: (result) => {
        if (result.success && result.redirectTo) go({ to: withDestination(result.redirectTo, to) });
      },
      onError: ignoreError,
    },
  });

  /** Resolves with the failure to show, or undefined when the next screen was opened. */
  const submit = useCallback(
    async (body: LoginBody): Promise<Error | undefined> => {
      try {
        return failureOf(await mutateAsync(body));
      } catch (thrown) {
        return asError(thrown);
      }
    },
    [mutateAsync],
  );

  return { submit, isPending };
}

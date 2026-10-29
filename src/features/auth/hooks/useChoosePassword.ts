// Choosing a password after an invite or reset link (with a token), or after a temporary password (without one).
import { useGo, useUpdatePassword } from '@refinedev/core';
import { useCallback } from 'react';
import { withDestination } from '../destination';
import { loginPath } from '../paths';
import type { SetPasswordBody } from '../types';
import { asError, failureOf, ignoreError } from './authFailure';
import { useDestination } from './useDestination';

/**
 * Runs the auth provider's `updatePassword` through Refine's `useUpdatePassword`. On success it opens the sign-in
 * screen with the "Password updated" banner; a refusal is returned to the form (the same reasons as in
 * useCredentialsStep).
 */
export function useChoosePassword() {
  const go = useGo();
  const { to } = useDestination();
  const { mutateAsync, isPending } = useUpdatePassword<SetPasswordBody>({
    mutationOptions: {
      onSuccess: (result) => {
        if (result.success) {
          go({ to: withDestination(result.redirectTo ?? loginPath('password-set'), to), type: 'replace' });
        }
      },
      onError: ignoreError,
    },
  });

  /** Resolves with the failure to show, or undefined when the password was set. */
  const submit = useCallback(
    async (body: SetPasswordBody): Promise<Error | undefined> => {
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

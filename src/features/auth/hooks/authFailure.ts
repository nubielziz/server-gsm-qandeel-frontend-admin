// Refine's auth hooks (`useLogin`, `useUpdatePassword`) resolve with `{ success: false, error }` when the auth provider
// refuses, instead of rejecting. These helpers turn either outcome into the error a sign-in form shows.
import type { AuthActionResponse } from '@refinedev/core';

/** The error of a refused auth action, or undefined when it worked. */
export function failureOf(result: AuthActionResponse): Error | undefined {
  if (result.success) return undefined;
  return result.error instanceof Error
    ? result.error
    : new Error(result.error?.message ?? 'The request failed.');
}

/** Whatever a rejected mutation threw, as an Error. */
export function asError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}

/** For `mutationOptions.onError`: the form shows the error itself, so Refine's toast (titled "ApiError") is skipped. */
export function ignoreError(): void {}

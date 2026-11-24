// The words for a refused reused key. Every wallet write and the rank change send one Idempotency-Key per dialog opening; a key sent again
// with another request is refused by the server (409 `IDEMPOTENCY_KEY_REUSED`). That happens when the first press posted but its answer was lost
// and the person changed the form before pressing again. The raw words ("This idempotency key was already used with a different request.")
// tell staff nothing, so the console says what happened and what to do: nothing was posted twice, close the window and look before trying again.
import { ApiError, isApiError } from '@/lib/api';

/** The error code the server answers with when a key comes back with a different request. */
export const KEY_REUSED_CODE = 'IDEMPOTENCY_KEY_REUSED';

/** What the dialog says. It never offers a retry with a new key: a new key could post the change a second time. */
export const KEY_REUSED_WORDS =
  'A change from this window was already applied, so this one was not sent and nothing was posted twice. Close this window and check the account before trying again.';

/** Whether an error is the server's refusal of a reused key. */
export function isKeyReused(error: unknown): error is ApiError {
  return isApiError(error) && error.code === KEY_REUSED_CODE;
}

/**
 * The same refusal with plain words for staff: only the detail changes (status, code, title and request id stay, so a report can quote it).
 *
 * @param error the refusal of a reused key.
 * @returns a new error to throw in its place.
 */
export function withKeyReusedWords(error: ApiError): ApiError {
  return new ApiError({
    status: error.status,
    code: error.code,
    title: error.title,
    detail: KEY_REUSED_WORDS,
    type: error.type,
    fieldErrors: error.fieldErrors,
    fieldCodes: error.fieldCodes,
    formErrors: error.formErrors,
    requestId: error.requestId,
    retryAfter: error.retryAfter,
    cause: error,
  });
}

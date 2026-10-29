// Turns a failed sign-in call into the text the sign-in screens show, and sorts a set-password failure into the
// place on screen where it belongs. The server's words are shown as they are (ARCHITECTURE §4); only the wait time of
// a rate limit is composed here.
import { ERROR_CODES, isApiError } from '@/lib/api';
import { errorToast } from '@/lib/query';

/** A message for the banner at the top of a sign-in form. */
export type AuthErrorInfo = { title: string; detail?: string; requestId?: string };

/** Title and detail of any thrown value. A rate limit says how long to wait ("Try again in 30 seconds."). */
export function describeAuthError(error: unknown): AuthErrorInfo {
  if (isApiError(error)) {
    const limited = error.status === 429 || error.code === ERROR_CODES.RATE_LIMITED;
    return {
      title: error.title,
      detail: limited ? errorToast(error).description : error.detail,
      requestId: error.requestId,
    };
  }
  return { title: 'Something went wrong', detail: error instanceof Error ? error.message : undefined };
}

/**
 * Splits a failure for a form with one field: the server's message for that field goes under the field, anything
 * else (wrong session, rate limit, network) goes in the banner.
 */
export function splitFieldError(error: unknown, field: string): { field?: string; banner?: AuthErrorInfo } {
  if (isApiError(error)) {
    const messages = error.fieldErrors[field];
    if (messages?.length) return { field: messages.join(' ') };
  }
  return { banner: describeAuthError(error) };
}

/** Where a failed set-password request is shown. */
export type SetPasswordFailure =
  /** The link is dead (expired or already used): retyping cannot help, so the page replaces its form with this. */
  | { kind: 'token'; info: AuthErrorInfo }
  /** The password was refused: the message belongs under the password field. */
  | { kind: 'password'; message: string }
  /** Anything else: a banner above the form. */
  | { kind: 'general'; info: AuthErrorInfo };

/**
 * `TOKEN_INVALID` (410) means the link is dead; `WEAK_PASSWORD` (422), or any message the server attaches to the
 * `password` field, goes under that field; the rest is general.
 */
export function mapSetPasswordError(error: unknown): SetPasswordFailure {
  if (isApiError(error)) {
    if (error.code === ERROR_CODES.TOKEN_INVALID) return { kind: 'token', info: describeAuthError(error) };
    const onField = error.fieldErrors.password?.join(' ');
    if (onField) return { kind: 'password', message: onField };
    if (error.code === ERROR_CODES.WEAK_PASSWORD) {
      return { kind: 'password', message: error.detail ?? error.title };
    }
  }
  return { kind: 'general', info: describeAuthError(error) };
}

// Turns a failed sign-in call into the text the sign-in screens show, and sorts a set-password failure into the
// place on screen where it belongs. The server's words are shown as they are (ARCHITECTURE §4), except on the
// email-and-password step, where a wrong pair gets fixed generic words and a rate limit names its reason and wait.
import { ERROR_CODES, isApiError } from '@/lib/api';
import { errorToast } from '@/lib/query';
import type { LoginReason } from '../paths';

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

/** "30 seconds" or "5 minutes", from a Retry-After value in seconds. */
function waitText(seconds: number): string {
  if (seconds < 120) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  return `${Math.ceil(seconds / 60)} minutes`;
}

/**
 * The failure of the email-and-password step. A wrong pair gets the same words whatever the server says, so the
 * screen never hints which of the two was wrong, plus the next step. A rate limit names the reason and the wait.
 * Anything else keeps the server's words.
 */
export function describeSignInFailure(error: unknown): AuthErrorInfo {
  if (isApiError(error)) {
    if (error.status === 401 || error.code === ERROR_CODES.UNAUTHORIZED) {
      return {
        title: 'Email or password is incorrect',
        detail: 'Check both and try again, or ask an Owner to send you a reset link.',
        requestId: error.requestId,
      };
    }
    if (error.status === 429 || error.code === ERROR_CODES.RATE_LIMITED) {
      const wait = error.retryAfter === undefined ? 'a few minutes' : waitText(error.retryAfter);
      return {
        title: 'Too many sign-in attempts',
        detail: `Sign-in is paused for now. Try again in ${wait}.`,
        requestId: error.requestId,
      };
    }
  }
  return describeAuthError(error);
}

/** The two refusals that get a screen of their own instead of a banner (the same names as `?reason=`). */
export type BlockedKind = Extract<LoginReason, 'suspended' | 'ip'>;

/**
 * Which blocked-access screen a failed sign-in call asks for, or undefined for any other failure. The server's code
 * decides (`ACCOUNT_SUSPENDED`, `IP_NOT_ALLOWED`), the same two codes the auth provider turns into `?reason=`.
 */
export function blockedKindOf(error: unknown): BlockedKind | undefined {
  if (!isApiError(error)) return undefined;
  if (error.code === ERROR_CODES.ACCOUNT_SUSPENDED) return 'suspended';
  if (error.code === ERROR_CODES.IP_NOT_ALLOWED) return 'ip';
  return undefined;
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

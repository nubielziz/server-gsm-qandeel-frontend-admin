// Toast content for API results, and the default text of an error toast. Used by useApiMutation.
import { ERROR_CODES, type ApiError } from '@/lib/api';

/** What a toast shows; the notification provider adds the type (success or error). */
export type Toast = { message: string; description?: string };

/** "30 seconds", "2 minutes": how long a rate-limited user should wait. */
function waitText(seconds: number): string {
  if (seconds < 120) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  return `${Math.ceil(seconds / 60)} minutes`;
}

/**
 * The default toast for a failed call: the server's title and detail. A rate-limit answer says how long to
 * wait (ARCHITECTURE §4). The request id is added when the server sent one, so a report can quote it.
 */
export function errorToast(error: ApiError): Toast {
  if (error.code === ERROR_CODES.RATE_LIMITED || error.status === 429) {
    const wait = error.retryAfter === undefined ? 'a moment' : waitText(error.retryAfter);
    return { message: error.title, description: `Too many requests. Try again in ${wait}.` };
  }
  const description = [error.detail, error.requestId ? `Request ID: ${error.requestId}` : undefined]
    .filter(Boolean)
    .join(' ');
  return { message: error.title, description: description || undefined };
}

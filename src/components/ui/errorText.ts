// Duck-typed reading of errors for the kit: components never import lib/api, they only look for these fields.

/** The fields the kit can show. Any thrown value that has some of them works (ApiError, Error, plain object). */
export interface ErrorLike {
  message?: string;
  title?: string;
  detail?: string;
  requestId?: string;
}

const FALLBACK = 'Something went wrong. Try again.';

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

/** One line for a dialog's error slot. The server's detail wins because it names the actual problem. */
export function errorText(error: unknown): string {
  if (typeof error === 'string' && error) return error;
  const e = asErrorLike(error);
  return e.detail || e.message || e.title || FALLBACK;
}

/** The three parts ErrorState shows. A message that only repeats the title is dropped. */
export function errorParts(error: unknown): { title?: string; detail?: string; requestId?: string } {
  const e = asErrorLike(error);
  const detail = e.detail || (e.message && e.message !== e.title ? e.message : undefined);
  return { title: e.title, detail, requestId: e.requestId };
}

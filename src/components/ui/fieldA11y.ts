// Shared helpers of the form fields: error text from a string or a react-hook-form FieldError, and aria wiring.

/** A message, or any object with one (react-hook-form's FieldError fits without importing it). */
export type FieldErrorLike = string | { message?: string } | null | undefined | false;

export function errorMessage(error: FieldErrorLike): string | undefined {
  if (!error) return undefined;
  return typeof error === 'string' ? error : error.message || undefined;
}

/** Utility class that draws a red border on an invalid control (the demo only set aria-invalid, with no style). */
export const INVALID_BORDER = 'aria-[invalid=true]:border-crit-dot';

export function hintId(id: string): string {
  return `${id}-hint`;
}

export function errorId(id: string): string {
  return `${id}-error`;
}

/** aria-describedby for a control: the hint and the error text, when present. */
export function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint && hintId(id), hasError && errorId(id)].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

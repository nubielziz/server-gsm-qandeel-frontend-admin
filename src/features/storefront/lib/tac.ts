// Small checks for the TAC form. They are hints for the person typing; the server validates what it receives.

/** A TAC is the first 8 digits of an IMEI. */
export function isTacPrefix(text: string): boolean {
  return /^\d{8}$/.test(text.trim());
}

/** A release year written with 4 digits. */
export function isYear(text: string): boolean {
  return /^\d{4}$/.test(text.trim());
}

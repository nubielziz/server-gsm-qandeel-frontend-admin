// The shape of an authenticator code.

export const CODE_LENGTH = 6;

/** Everything that is not a digit is dropped and the rest is cut to six digits ("123 456" and "123-456" both work). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

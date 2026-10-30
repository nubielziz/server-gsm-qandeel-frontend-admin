// CodeField: the 6-digit authenticator code input of the two-step screens (verify and first-time setup).
import { forwardRef } from 'react';
import { AuthField } from './AuthField';
import { digitsOnly } from './codeInput';

export interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Digits only (a pasted "123 456" becomes "123456"), the numeric keypad on phones, and one-time-code autocomplete so
 * phones can offer the code. It takes the focus on arrival: the code is the only thing this screen needs.
 */
export const CodeField = forwardRef<HTMLInputElement, CodeFieldProps>(function CodeField(
  { value, onChange, error },
  ref,
) {
  return (
    <AuthField
      ref={ref}
      code
      label="Authentication code"
      error={error}
      value={value}
      onChange={(event) => onChange(digitsOnly(event.target.value))}
      inputMode="numeric"
      autoComplete="one-time-code"
      spellCheck={false}
      autoFocus
    />
  );
});

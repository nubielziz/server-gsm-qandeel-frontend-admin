// CodeField: the 6-digit authenticator code input. It keeps digits only, so a pasted "123 456" or "123-456" works.
import { forwardRef } from 'react';
import { TextField } from '@/components/ui';
import { digitsOnly } from './codeInput';

export interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * `autoComplete="one-time-code"` lets phones offer the code from a text message or the password manager.
 * There is no `maxLength`: the browser would cut a pasted "123 456" to "123 45" before the digits can be picked out.
 * The ref goes to the input, so the form can move focus back after a wrong code.
 */
export const CodeField = forwardRef<HTMLInputElement, CodeFieldProps>(function CodeField(
  { value, onChange, error },
  ref,
) {
  return (
    <TextField
      ref={ref}
      label="Authentication code"
      hint="The 6 digits shown in your authenticator app."
      error={error}
      value={value}
      onChange={(event) => onChange(digitsOnly(event.target.value))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      spellCheck={false}
      autoFocus
      className="text-center font-mono text-lg tracking-[0.35em]"
    />
  );
});

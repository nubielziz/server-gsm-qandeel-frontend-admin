// PasswordField: the password input of the sign-in and set-password screens, with a Show/Hide button at its right edge.
// Staff often sign in on a phone or type a long password twice, and being able to check it saves a failed attempt.
import { forwardRef, useId, useState } from 'react';
import { TextField, type TextFieldProps } from '@/components/ui';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'label'> {
  /** Plain text: it is also part of the Show/Hide button's name, so two password fields stay apart for a screen reader. */
  label: string;
}

/**
 * Wraps the kit's TextField, so the label, hint, error text and `aria-describedby` stay the kit's. The button is placed
 * over the input from outside: the label line (16px) plus its 8px gap puts the 36px input at 24px, so a 28px button
 * sits at 28px from the top. `autoComplete`, `name`, `onChange` and the ref go to the input, which is what
 * react-hook-form's `register` needs. The button is `aria-pressed` and `aria-controls` the input.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <TextField
        ref={ref}
        id={fieldId}
        label={label}
        type={shown ? 'text' : 'password'}
        wrapperClassName="[&_.label]:mb-2"
        className={className ? `h-9 pe-16 ${className}` : 'h-9 pe-16'}
        {...rest}
      />
      <button
        type="button"
        aria-pressed={shown}
        aria-controls={fieldId}
        onClick={() => setShown((value) => !value)}
        className="absolute end-1 top-7 inline-flex h-7 items-center rounded px-2 text-xs font-medium text-ink2 underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        {shown ? 'Hide' : 'Show'}
        <span className="sr-only"> {label}</span>
      </button>
    </div>
  );
});

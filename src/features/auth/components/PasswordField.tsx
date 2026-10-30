// PasswordField: an AuthField for passwords with a Show/Hide button inside its end. Used by the sign-in form and by
// the choose-a-password screen (two fields there, so each button names its own field).
import { forwardRef, useId, useState } from 'react';
import { AuthField, type AuthFieldProps } from './AuthField';

export type PasswordFieldProps = Omit<AuthFieldProps, 'type' | 'endSlot'>;

/**
 * Starts hidden. The button is a plain type="button" (it never submits) whose aria-label says what pressing it does,
 * such as "Show password" or "Hide new password"; the visible word is part of that name.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [shown, setShown] = useState(false);
  const action = shown ? 'Hide' : 'Show';
  return (
    <AuthField
      ref={ref}
      id={fieldId}
      label={label}
      type={shown ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      endSlot={
        <button
          type="button"
          aria-label={`${action} ${label.toLowerCase()}`}
          aria-controls={fieldId}
          onClick={() => setShown((value) => !value)}
          className="h-11 min-w-14 rounded-e-lg px-3 text-sm font-medium text-ink2 transition-colors hover:text-ink focus-visible:outline-offset-[-4px] motion-reduce:transition-none"
        >
          {action}
        </button>
      }
      {...rest}
    />
  );
});

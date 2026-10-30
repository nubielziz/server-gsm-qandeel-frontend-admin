// AuthField: the labelled text input of the sign-in screens (sign in, two-step code, choose a password). Larger than
// the console's dense fields: 44px tall, 16px text on phones and 15px from 768px (docs/login-design.md).
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx, Icon } from '@/components/ui';
import { errorId, errorMessage, hintId, type FieldErrorLike } from '@/components/ui/fieldA11y';

/**
 * The input's look, without its text size (see TEXT_CLASS). The border is ink3 at 80%, which keeps over 3:1 against the
 * card in both themes (the border is the only thing that shows where the field is). Focus draws a 2px ring (the
 * border plus one pixel of shadow) and a soft halo: accent, or crit on a field with an error.
 */
const INPUT_CLASS = cx(
  'block h-11 w-full rounded-lg border border-[rgb(var(--ink3)/0.8)] bg-surface px-3 text-ink',
  'transition-[border-color,box-shadow] duration-150 placeholder:text-ink3 hover:border-ink3 motion-reduce:transition-none',
  'focus:border-accent focus:shadow-[0_0_0_1px_rgb(var(--accent)),0_0_0_5px_rgb(var(--accent)/0.16)] focus:outline-none',
  'aria-[invalid=true]:border-crit-dot aria-[invalid=true]:focus:border-crit-dot',
  'aria-[invalid=true]:focus:shadow-[0_0_0_1px_rgb(var(--crit-dot)),0_0_0_5px_rgb(var(--crit-dot)/0.16)]',
);

/**
 * Text: 16px on phones, because iOS zooms into anything smaller, and 15px from 768px. A one-time code is mono, larger
 * and centred; its letter spacing also trails the last digit, so an equal indent keeps the digits truly centred.
 */
const TEXT_CLASS = {
  text: 'text-lg md:text-[15px]',
  code: 'text-center indent-[0.4em] font-mono text-xl tracking-[0.4em]',
};

export interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Plain text: screen readers read it as the field's name. */
  label: string;
  /** Help under the field, read out with it (aria-describedby). */
  hint?: ReactNode;
  /** A message or a react-hook-form FieldError. Sets aria-invalid and aria-errormessage, and shows the text. */
  error?: FieldErrorLike;
  /** Sits at the end of the label's row, such as the "Forgot your password?" toggle. */
  labelAside?: ReactNode;
  /** Sits inside the input at its end, such as the Show/Hide button; the text keeps clear of it. */
  endSlot?: ReactNode;
  /** Styles the input for a one-time code. */
  code?: boolean;
}

/**
 * Label, input, error and hint, wired for assistive technology: the error is named by aria-errormessage and, for
 * screen readers that ignore that attribute, also by aria-describedby.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, hint, error, labelAside, endSlot, code = false, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = errorMessage(error);
  const describedBy = [message && errorId(fieldId), hint && hintId(fieldId)].filter(Boolean).join(' ');
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          className={cx(
            INPUT_CLASS,
            TEXT_CLASS[code ? 'code' : 'text'],
            endSlot ? 'pe-16' : undefined,
            className,
          )}
          aria-invalid={message ? true : undefined}
          aria-errormessage={message ? errorId(fieldId) : undefined}
          aria-describedby={describedBy || undefined}
          {...rest}
        />
        {endSlot && <div className="absolute inset-y-0 end-0 flex items-center">{endSlot}</div>}
      </div>
      {message && (
        <p id={errorId(fieldId)} className="mt-1.5 flex items-start gap-1.5 text-sm text-crit-fg">
          {/* The icon says "error" without relying on the colour alone. */}
          <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
          <span>{message}</span>
        </p>
      )}
      {hint && (
        <p id={hintId(fieldId)} className="mt-1.5 text-sm text-ink2">
          {hint}
        </p>
      )}
    </div>
  );
});

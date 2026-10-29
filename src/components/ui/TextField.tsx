// TextField: labelled text input. Ports field() + the demo's <input class="input"> for dialogs and forms.
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { FieldFrame } from './FieldFrame';
import { describedBy, errorMessage, INVALID_BORDER, type FieldErrorLike } from './fieldA11y';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  hint?: ReactNode;
  /** A message or a react-hook-form FieldError. Sets aria-invalid and shows the text under the control. */
  error?: FieldErrorLike;
  /** Classes for the wrapper (width, grid placement). `className` goes to the input itself. */
  wrapperClassName?: string;
}

/**
 * The ref goes to the input, so `<TextField {...register('name')} />` works with react-hook-form
 * (it needs the element to read the value and to focus the first invalid field).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, wrapperClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = errorMessage(error);
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={message} className={wrapperClassName}>
      <input
        ref={ref}
        id={fieldId}
        className={cx('input', INVALID_BORDER, className)}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), Boolean(message))}
        {...rest}
      />
    </FieldFrame>
  );
});

// TextareaField: labelled multi-line input (the demo's <textarea class="input" rows="3">).
import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';
import { FieldFrame } from './FieldFrame';
import { describedBy, errorMessage, INVALID_BORDER, type FieldErrorLike } from './fieldA11y';

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: FieldErrorLike;
  wrapperClassName?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, hint, error, wrapperClassName, className, id, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = errorMessage(error);
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={message} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={cx('input', INVALID_BORDER, className)}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), Boolean(message))}
        {...rest}
      />
    </FieldFrame>
  );
});

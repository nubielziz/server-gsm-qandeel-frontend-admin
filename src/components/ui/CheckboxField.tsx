// CheckboxField: checkbox with its label text (the demo's `<label><input class="check">text</label>`).
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { errorId, errorMessage, hintId, describedBy, type FieldErrorLike } from './fieldA11y';

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: FieldErrorLike;
  /** `start` lines the box up with the first line of a long, wrapping label. */
  align?: 'center' | 'start';
  wrapperClassName?: string;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(function CheckboxField(
  { label, hint, error, align = 'center', wrapperClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = errorMessage(error);
  return (
    <div className={wrapperClassName}>
      <label
        className={cx(
          'flex cursor-pointer gap-2 text-sm',
          align === 'start' ? 'items-start' : 'items-center',
        )}
      >
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          className={cx('check', align === 'start' && 'mt-0.5', className)}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(fieldId, Boolean(hint), Boolean(message))}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p className="hint" id={hintId(fieldId)}>
          {hint}
        </p>
      )}
      {message && (
        <p className="mt-1 text-xs text-crit-fg" id={errorId(fieldId)}>
          {message}
        </p>
      )}
    </div>
  );
});

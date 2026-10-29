// SelectField: native select with the chevron overlay. Ports selectEl() of 20-ui.js and field() around it.
import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from './cx';
import { FieldFrame } from './FieldFrame';
import { describedBy, errorMessage, INVALID_BORDER, type FieldErrorLike } from './fieldA11y';
import { Icon } from './Icon';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[];
  /** Visible label. Without it (toolbar filters) give the select an aria-label. */
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldErrorLike;
  /** Classes for the outer wrapper when there is a label. */
  wrapperClassName?: string;
  /** Classes for the `select-wrap` span around the select, for example `w-full` or `min-w-[200px]`. */
  selectWrapClassName?: string;
}

/** The select sizes to its longest option, like the demo; pass `selectWrapClassName="w-full"` to stretch it. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { options, label, hint, error, wrapperClassName, selectWrapClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = errorMessage(error);
  const control = (
    <span className={cx('select-wrap', selectWrapClassName)}>
      <select
        ref={ref}
        id={fieldId}
        className={cx(INVALID_BORDER, className)}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), Boolean(message))}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevD" className="ic-sm" />
    </span>
  );
  if (!label && !hint && !message) return control;
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={message} className={wrapperClassName}>
      {control}
    </FieldFrame>
  );
});

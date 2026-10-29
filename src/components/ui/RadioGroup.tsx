// RadioGroup: bordered radio options with an optional description each (the demo's password-mode options).
import { forwardRef, useId, type ChangeEventHandler, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { errorId, errorMessage, type FieldErrorLike } from './fieldA11y';

export interface RadioOption {
  value: string;
  label: ReactNode;
  /** Muted explanation under the label. */
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'children'
> {
  legend: ReactNode;
  name: string;
  options: readonly RadioOption[];
  /** Controlled value. Leave it out (and use defaultValue or register()) for an uncontrolled group. */
  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  error?: FieldErrorLike;
  /** Tint the chosen option (accent border + soft fill), like the demo's payment-method picker. */
  highlight?: boolean;
  /** Classes for the list of options, for example `grid gap-2 sm:grid-cols-3`. */
  listClassName?: string;
}

/**
 * The ref goes to every radio input, so `<RadioGroup {...register('mode')} />` works: react-hook-form
 * collects all inputs that share the name.
 */
export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(function RadioGroup(
  { legend, name, options, value, defaultValue, onChange, error, highlight = false, listClassName, ...rest },
  ref,
) {
  const baseId = useId();
  const message = errorMessage(error);
  return (
    <fieldset className="min-w-0" aria-describedby={message ? errorId(baseId) : undefined}>
      <legend className="label">{legend}</legend>
      <div className={listClassName ?? 'space-y-2'}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              'flex cursor-pointer items-start gap-2.5 rounded-md border border-line2 px-3 py-2.5 text-sm',
              highlight && 'has-[:checked]:border-accent has-[:checked]:bg-accent-soft',
            )}
          >
            <input
              ref={ref}
              type="radio"
              name={name}
              value={option.value}
              className="mt-0.5 accent-[rgb(var(--accent))]"
              disabled={option.disabled}
              aria-invalid={message ? true : undefined}
              {...(value !== undefined
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value })}
              onChange={onChange}
              {...rest}
            />
            <span>
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-ink3">{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {message && (
        <p className="mt-1 text-xs text-crit-fg" id={errorId(baseId)}>
          {message}
        </p>
      )}
    </fieldset>
  );
});

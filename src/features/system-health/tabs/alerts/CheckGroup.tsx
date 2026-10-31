// CheckGroup: a labelled group of checkboxes for the dialogs of the Alerts & incidents tab (the channels of a rule, the
// components of an incident). It is controlled, so it works with react-hook-form's `Controller`.
import { useId, type ReactNode } from 'react';
import { CheckboxField, cx } from '@/components/ui';

export interface CheckOption {
  value: string;
  label: ReactNode;
}

export interface CheckGroupProps {
  legend: ReactNode;
  options: readonly CheckOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** The message under the group (a client hint or the server's 422 text). It also marks the boxes invalid. */
  error?: string;
  hint?: ReactNode;
  /** Classes for the list of boxes, for example `grid gap-2 sm:grid-cols-2`. */
  listClassName?: string;
}

/**
 * The picked values keep the order of the options, so the same choice always sends the same list. One message sits under
 * the whole group, not under a single box; every box carries `aria-invalid`, so the dialog can focus the first one.
 */
export function CheckGroup({
  legend,
  options,
  value,
  onChange,
  error,
  hint,
  listClassName,
}: CheckGroupProps) {
  const messageId = useId();
  const toggle = (option: string, checked: boolean) => {
    const next = checked ? [...value, option] : value.filter((item) => item !== option);
    onChange(options.map((item) => item.value).filter((item) => next.includes(item)));
  };
  return (
    <fieldset className="min-w-0" aria-describedby={error ? messageId : undefined}>
      <legend className="label">{legend}</legend>
      <div className={cx(listClassName ?? 'space-y-2')}>
        {options.map((option) => (
          <CheckboxField
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            aria-invalid={error ? true : undefined}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {error && (
        <p id={messageId} className="mt-1 text-xs text-crit-fg">
          {error}
        </p>
      )}
    </fieldset>
  );
}

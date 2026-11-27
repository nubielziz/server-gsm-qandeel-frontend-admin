// ReadField: a label with a plain value beside or under it, for a fact a form shows but nobody types (the address of a shop page, the next
// version number of a legal document, the key of an alert rule). Drawn like a TextField in the same layouts, so it lines up with the inputs
// around it (decision 035).
import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import { describedBy, errorId, hintId } from './fieldA11y';
import { FormRow } from './FormRow';
import { ReadValue } from './ReadValue';

export interface ReadFieldProps {
  label: string;
  /** What the value is, drawn in the mono face (an address, a number). */
  mono?: boolean;
  hint?: ReactNode;
  /** A server message about the value (it was refused after the form was sent). */
  error?: string;
  /** `stacked` (default): the label above the value. `row`: the label in a column at the left. */
  layout?: 'stacked' | 'row';
  children: ReactNode;
}

/**
 * Not an input: the value is read from the page and cannot be edited here. It is a group named by its label, and the group points to its
 * hint and its error (`aria-describedby`), so a screen reader reads what is wrong with the value together with the value.
 */
export function ReadField({
  label,
  mono = false,
  hint,
  error,
  layout = 'stacked',
  children,
}: ReadFieldProps) {
  const labelId = useId();
  const value = <ReadValue className={cx(mono && 'mono', 'break-all')}>{children}</ReadValue>;
  if (layout === 'row') {
    return (
      <FormRow label={label} hint={hint} error={error}>
        {value}
      </FormRow>
    );
  }
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy(labelId, Boolean(hint), Boolean(error))}
    >
      <span className="label" id={labelId}>
        {label}
      </span>
      {value}
      {hint && (
        <p className="hint" id={hintId(labelId)}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-crit-fg" id={errorId(labelId)}>
          {error}
        </p>
      )}
    </div>
  );
}

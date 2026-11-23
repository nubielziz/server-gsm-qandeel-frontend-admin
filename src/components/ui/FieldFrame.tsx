// FieldFrame: label above, control, hint and error text below. Ports field(label, control, hint) of 20-ui.js.
// With layout="row" the label sits in a column on the left instead (FormRow), as in the Product / Services forms.
import type { ReactNode } from 'react';
import { errorId, hintId } from './fieldA11y';
import { FormRow } from './FormRow';

export interface FieldFrameProps {
  /** Id of the control, so the label and the hint/error text can be tied to it. */
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  /** `stacked` (default): the label above the control. `row`: the label in a column at its left; narrow screens stack it again. */
  layout?: 'stacked' | 'row';
  /** Row layout only: draws a "*" after the label. */
  required?: boolean;
  children: ReactNode;
}

export function FieldFrame({
  id,
  label,
  hint,
  error,
  className,
  layout = 'stacked',
  required,
  children,
}: FieldFrameProps) {
  if (layout === 'row') {
    return (
      <FormRow
        label={label ?? null}
        htmlFor={id}
        required={required}
        hint={hint}
        error={error}
        className={className}
      >
        {children}
      </FormRow>
    );
  }
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {hint && (
        <p className="hint" id={hintId(id)}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-crit-fg" id={errorId(id)}>
          {error}
        </p>
      )}
    </div>
  );
}

// FieldFrame: label above, control, hint and error text below. Ports field(label, control, hint) of 20-ui.js.
import type { ReactNode } from 'react';
import { errorId, hintId } from './fieldA11y';

export interface FieldFrameProps {
  /** Id of the control, so the label and the hint/error text can be tied to it. */
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function FieldFrame({ id, label, hint, error, className, children }: FieldFrameProps) {
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

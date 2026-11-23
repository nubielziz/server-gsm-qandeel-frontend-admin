// FormRow: one label-left row of a form (the label in a fixed column, the control beside it), as in the layout the owner asked for.
import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import { errorId, hintId } from './fieldA11y';

export interface FormRowProps {
  /** The label. Empty (null) leaves the label column blank, so a lone checkbox lines up with the controls above it. */
  label: ReactNode;
  /**
   * Id of the control the label names: it becomes a <label for>. Without it the row is a group named by its label, which is right
   * for several controls in one row (a number and its unit). The hint and the error get the ids `<htmlFor>-hint` and `<htmlFor>-error`
   * (the kit's convention), so the control can point to them with aria-describedby.
   */
  htmlFor?: string;
  /** Draws a "*" after the label. It is decoration: put `required` on the control for assistive technology. */
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** Classes for the row (a different top margin, a grid placement). */
  className?: string;
  children: ReactNode;
}

/** The two columns stack on a phone. The label lines up with the first line of the control, also beside a tall one (a textarea). */
export function FormRow({ label, htmlFor, required, hint, error, className, children }: FormRowProps) {
  const labelId = useId();
  const hasLabel = label !== null && label !== undefined && label !== false && label !== '';
  const grouped = hasLabel && !htmlFor;
  const star = required ? (
    <span aria-hidden="true" className="ms-0.5">
      *
    </span>
  ) : null;
  return (
    <div className={cx('form-row', className)}>
      <div className="form-row-label">
        {hasLabel &&
          (htmlFor ? (
            <label htmlFor={htmlFor}>
              {label}
              {star}
            </label>
          ) : (
            <span id={labelId}>
              {label}
              {star}
            </span>
          ))}
      </div>
      <div
        className="form-row-body"
        role={grouped ? 'group' : undefined}
        aria-labelledby={grouped ? labelId : undefined}
      >
        {children}
        {hint && (
          <p className="hint" id={htmlFor ? hintId(htmlFor) : undefined}>
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1 text-xs text-crit-fg" id={htmlFor ? errorId(htmlFor) : undefined}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Button: the demo's .btn family (variants, small, icon-only) plus a loading state.
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { buttonClass, type ButtonStyle } from './buttonClass';
import { Icon } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyle {
  /** Shows a spinner and blocks clicks until the work is done (also sets aria-busy). */
  loading?: boolean;
}

/**
 * A 32px button. `type` defaults to "button" so it never submits a form by accident.
 * The ref is forwarded because menus and popovers anchor to their trigger button.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, loading = false, className, type = 'button', disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, icon, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Icon name="loader" className="ic-sm animate-spin" />}
      {/* An icon-only button has no room for both: the spinner replaces its icon. */}
      {loading && icon ? null : children}
    </button>
  );
});

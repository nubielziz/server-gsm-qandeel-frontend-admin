// AuthButton: the full-width, 44px buttons of the sign-in screens. The primary one is solid accent ink; the secondary
// one (Retry, "Use another account") is a quiet outline. See docs/login-design.md for the contrast figures.
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx, Icon } from '@/components/ui';
import { authButtonClass, type AuthButtonVariant } from './authButtonClass';

export interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuthButtonVariant;
  /**
   * The request is running: a spinner takes the label's place (the label stays, invisible, so the size and the
   * accessible name do not change) and further clicks or Enter presses are ignored.
   */
  loading?: boolean;
}

/** A sign-in screen button with a loading state that blocks double submits without dropping keyboard focus. */
export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(function AuthButton(
  { variant = 'primary', loading = false, className, type = 'button', onClick, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      // aria-disabled rather than disabled: a disabled button would drop the focus it holds while the request runs.
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      className={authButtonClass(variant, className)}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      <span className={cx('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
      {loading && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <Icon name="loader" className="h-[18px] w-[18px] animate-spin" />
        </span>
      )}
    </button>
  );
});

// authButtonClass: the look of the sign-in screens' 44px full-width buttons, shared by AuthButton and by links that
// act as a screen's one next step ("Use another account", "Back to sign in" on a dead link).
import { cx } from '@/components/ui';

export type AuthButtonVariant = 'primary' | 'secondary';

/**
 * The button look, also used by links that act as the screen's one next step. Hover and press mix the accent with
 * the ink colour, so they darken it on paper and lighten it on the dark theme: the label's contrast only grows.
 */
export function authButtonClass(variant: AuthButtonVariant = 'primary', className?: string): string {
  return cx(
    'relative inline-flex h-11 w-full select-none items-center justify-center gap-2 rounded-lg px-4',
    'text-[15px] font-semibold transition-colors duration-150 motion-reduce:transition-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress',
    variant === 'primary'
      ? cx(
          'bg-accent-ink text-surface',
          'hover:bg-[color:color-mix(in_srgb,rgb(var(--accent-ink))_86%,rgb(var(--ink)))]',
          'active:bg-[color:color-mix(in_srgb,rgb(var(--accent-ink))_74%,rgb(var(--ink)))]',
        )
      : 'border border-line2 bg-surface text-ink hover:bg-hover active:bg-sunken',
    className,
  );
}

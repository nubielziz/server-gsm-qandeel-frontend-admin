// Class builder shared by Button and ButtonLink: the demo's .btn, .btn-primary, .btn-ghost… classes.
import { cx } from './cx';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'danger-solid';

export interface ButtonStyle {
  /** `primary` is the one ink-black action per surface; `danger-solid` is the confirm of a destructive dialog. */
  variant?: ButtonVariant;
  /** `sm` is 28px high; the default is 32px. */
  size?: 'md' | 'sm';
  /** Square icon-only button (`btn-icon`). Always give it an aria-label. */
  icon?: boolean;
  className?: string;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'danger-solid': 'btn-danger-solid',
};

export function buttonClass({
  variant = 'default',
  size = 'md',
  icon = false,
  className,
}: ButtonStyle): string {
  return cx('btn', VARIANT_CLASS[variant], size === 'sm' && 'btn-sm', icon && 'btn-icon', className);
}

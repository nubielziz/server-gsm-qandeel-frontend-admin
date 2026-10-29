// Switch: on/off toggle button. Ports switchEl() of 43-p-services.js (role="switch", aria-checked).
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'role' | 'aria-checked' | 'aria-label'
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Says what the switch does ("Enable Unlock Pro"); there is no visible text inside it. */
  label: string;
}

export function Switch({ checked, onChange, label, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      className={cx('switch', className)}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      {...rest}
    />
  );
}

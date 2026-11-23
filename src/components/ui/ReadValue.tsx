// ReadValue: a read-only figure or word in the control column of a label-left row, as tall as a control so its label lines up with it.
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ReadValueProps {
  children: ReactNode;
  /** A quiet word ("None") instead of a figure. */
  muted?: boolean;
  className?: string;
}

/** Not an input: nothing here can be edited. */
export function ReadValue({ children, muted = false, className }: ReadValueProps) {
  return (
    <span className={cx('flex items-center text-sm md:min-h-8', muted && 'text-ink3', className)}>
      {children}
    </span>
  );
}

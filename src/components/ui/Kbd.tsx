// Kbd: a keyboard key cap (the demo's .kbd), for shortcut hints.
import type { ReactNode } from 'react';
import { cx } from './cx';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx('kbd', className)}>{children}</kbd>;
}

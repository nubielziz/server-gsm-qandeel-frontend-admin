// Count: the neutral number chip used in tab labels and panel titles (the demo's .count).
import type { ReactNode } from 'react';
import { cx } from './cx';

/** A count is never a status: it stays grey, even when it is large. */
export function Count({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('count', className)}>{children}</span>;
}

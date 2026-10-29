// Skeleton: one grey loading bar (the demo's skel(width, height, cls)). Decorative, so hidden from screen readers.
import { cx } from './cx';

export interface SkeletonProps {
  /** CSS width: a number is px, a string is used as is ("88px", "50%"). Default fills the row. */
  width?: number | string;
  /** Height in px. */
  height?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 12, className }: SkeletonProps) {
  return <span className={cx('skel block', className)} style={{ width, height }} aria-hidden="true" />;
}

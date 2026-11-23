// SectionHeading: a heading inside a form view ("Bind Login", "Allow Country"); a later one is set off from what is above by a rule.
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SectionHeadingProps {
  children: ReactNode;
  /** The heading level. The page's own title is the h1, so a section is an h2 by default. */
  as?: 'h2' | 'h3';
  className?: string;
}

/** Not a panel: the parts of a record are sections of one view, each saved by its own button. */
export function SectionHeading({ children, as: Tag = 'h2', className }: SectionHeadingProps) {
  return <Tag className={cx('section-heading', className)}>{children}</Tag>;
}

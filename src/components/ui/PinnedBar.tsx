// PinnedBar: a bar pinned to the foot of the view, for the action of a form or the footer of a list (the layout the owner asked for).
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface PinnedBarProps {
  children: ReactNode;
  /** `start`: the content sits at the left (one primary button). `between`: it is spread across the bar (the footer pager). */
  align?: 'start' | 'between';
  className?: string;
}

/**
 * The last child of a view. It is sticky, so it stays on screen while a long view scrolls, and it ends the view when it is short;
 * wrap the view and the bar in a `view-frame` element to keep it at the foot of the window even then (the frame fills the space the
 * page leaves under its heading, so a short view neither scrolls nor lifts the bar). It reaches the edges of the page content, and
 * the toasts move up to clear it (index.css). One primary button per view goes here.
 */
export function PinnedBar({ children, align = 'start', className }: PinnedBarProps) {
  return (
    <div className={cx('pinned-bar', align === 'between' && 'pinned-bar-between', className)}>{children}</div>
  );
}

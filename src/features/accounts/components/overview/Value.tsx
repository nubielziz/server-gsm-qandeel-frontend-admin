// Value: a read-only value in the control column of a row of the Overview part, with an italic note after it and an action (a button)
// after the note. The kit's ReadValue is as tall as a control, so the label lines up with it.
import type { ReactNode } from 'react';
import { cx, ReadValue } from '@/components/ui';

export interface ValueProps {
  children?: ReactNode;
  /** A secondary fact in small italics ("merchant rank · 8% off base prices"). */
  note?: ReactNode;
  /** A small button that opens a dialog. */
  action?: ReactNode;
  /** A quiet word ("None") instead of a figure. */
  muted?: boolean;
  className?: string;
}

/** The value, its note, its action: one line that wraps on a narrow screen. */
export function Value({ children, note, action, muted, className }: ValueProps) {
  return (
    <ReadValue muted={muted} className={cx('flex-wrap gap-x-3 gap-y-1', className)}>
      {children}
      {note ? <span className="text-xs italic text-ink3">{note}</span> : null}
      {action}
    </ReadValue>
  );
}

// LegendBox: a bordered box whose legend sits on its border (the Quick Search box above a list or a price grid).
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface LegendBoxProps {
  /** The words on the border. They name the group for assistive technology. */
  legend: string;
  /** Laid out in a wrapping row (a select, a search box, a button); nest a block inside it for anything else. */
  children: ReactNode;
  /** Classes for the box itself. */
  className?: string;
}

/** A fieldset, so the controls inside are a named group: "Quick Search, group". */
export function LegendBox({ legend, children, className }: LegendBoxProps) {
  return (
    <fieldset className={cx('legend-box', className)}>
      <legend>{legend}</legend>
      <div className="legend-box-body">{children}</div>
    </fieldset>
  );
}

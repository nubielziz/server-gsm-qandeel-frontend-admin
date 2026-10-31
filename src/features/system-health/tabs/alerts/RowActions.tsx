// RowActions: the action buttons of one table row or card in the Alerts & incidents tab. They share one line when the window
// is wide enough, so rows keep one height; in a narrower panel they wrap, so a button is never cut off at its edge.
import { Children, type ReactNode } from 'react';
import { useHealthGrants } from '../../hooks';

/**
 * A read-only staff member gets no buttons, and a row with nothing to offer has none either, so this draws nothing at all:
 * an empty cell stays empty and a phone card does not end in a bare hairline. Each button still decides on its own
 * permission (`ActionButton`).
 *
 * The buttons stay on one line from a 1,320px window: 232px of sidebar and 48px of padding leave 1,040px, and the widest
 * table (Rules) needs about 1,010px with every button on one line. Below that the cell may wrap, because a table cannot
 * shrink a column that holds a line of buttons and would scroll sideways inside its card.
 */
export function RowActions({ children }: { children: ReactNode }) {
  const grants = useHealthGrants();
  if (!grants.ready || grants.readOnly || Children.toArray(children).length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 min-[1320px]:flex-nowrap">{children}</div>
  );
}

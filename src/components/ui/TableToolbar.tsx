// TableToolbar: filter row above a table with a live result count on the right. Ports tblToolbar(inner, count).
import type { ReactNode } from 'react';

export interface TableToolbarProps {
  /** Search box, selects, segmented filters. */
  children: ReactNode;
  /** Result summary ("340 orders"); announced politely when it changes. */
  count?: ReactNode;
}

export function TableToolbar({ children, count }: TableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      {children}
      <span className="flex-1" />
      {count != null && (
        <span className="text-xs text-ink3" aria-live="polite">
          {count}
        </span>
      )}
    </div>
  );
}

// WithSelected: "Check All / Uncheck All   With selected: [buttons]" under a table with a column of checkboxes.
import { useId, type ReactNode } from 'react';

export interface WithSelectedProps {
  /** How many rows are ticked. The buttons are disabled at 0 and the number is announced when it changes. */
  count: number;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  /** The bulk buttons (and selects). They sit in a group named "With selected". */
  children: ReactNode;
}

/**
 * The buttons sit in a fieldset that is disabled at 0, so every button and select inside is disabled with it, whatever the caller
 * puts there. A confirm question for a destructive one stays the caller's.
 */
export function WithSelected({ count, onCheckAll, onUncheckAll, children }: WithSelectedProps) {
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5 text-sm">
      <span className="flex items-center gap-1.5">
        <button type="button" className="link" onClick={onCheckAll}>
          Check All
        </button>
        <span aria-hidden="true" className="text-ink3">
          /
        </span>
        <button type="button" className="link" onClick={onUncheckAll}>
          Uncheck All
        </button>
      </span>
      <span id={labelId} className="text-xs italic text-ink3" aria-live="polite">
        {count > 0 ? `With selected (${count}):` : 'With selected:'}
      </span>
      <fieldset
        disabled={count === 0}
        aria-labelledby={labelId}
        className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
      >
        {children}
      </fieldset>
    </div>
  );
}

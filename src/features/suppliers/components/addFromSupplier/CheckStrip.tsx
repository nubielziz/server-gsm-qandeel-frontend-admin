// CheckStrip: "Check All / Uncheck All" and a count under the group table of the Add-from-supplier form, in the look of the strip the kit's
// WithSelected draws under the lists (the groups have no bulk button to put beside it).
import type { ReactNode } from 'react';

export interface CheckStripProps {
  onCheckAll: () => void;
  onUncheckAll: () => void;
  /** What is picked, read out politely when it changes ("3 groups picked, 120 services to add"). */
  summary: ReactNode;
}

/** The two link buttons and the count. */
export function CheckStrip({ onCheckAll, onUncheckAll, summary }: CheckStripProps) {
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
      <span className="text-xs italic text-ink3" aria-live="polite">
        {summary}
      </span>
    </div>
  );
}

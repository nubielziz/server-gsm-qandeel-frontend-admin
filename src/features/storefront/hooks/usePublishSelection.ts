// The ticked rows of the preview, kept across pages (`useRowSelection`), and the choice "all rows that match". That choice is true
// only under the search and filters it was made under: when they change, it is off again (the ticked rows stay ticked). While it is
// on, the table shows every row ticked, and any click on a tick box starts again from nothing (it unticks everything).
import { useState } from 'react';
import { useRowSelection, type RowSelection } from '@/components/ui';

/**
 * `matchKey` says which search and filters the table shows now (`matchKey()` of `lib/publishPreview`). `shown` is the selection the
 * table draws; `ticked` counts the rows ticked by hand; `selectAll` turns on "all that match" for them; `clear` unticks everything.
 */
export function usePublishSelection(matchKey: string) {
  const selection = useRowSelection<number>();
  const [chosenFor, setChosenFor] = useState<string | null>(null);
  const allMatching = chosenFor === matchKey;
  const clear = () => {
    selection.clear();
    setChosenFor(null);
  };
  const shown: RowSelection<number> = allMatching
    ? { selected: selection.selected, has: () => true, toggle: clear, setMany: clear, clear }
    : selection;
  return {
    selection,
    shown,
    ticked: selection.selected.size,
    allMatching,
    selectAll: () => setChosenFor(matchKey),
    clear,
  };
}

// What the import picker is looking at: the search text (and the same text after the typing stops), the group, "only not imported
// yet" and the page. The import dialog keeps it so the "Select all not imported" box and the table read the same search and group.
import { useState } from 'react';
import type { QuickAddGroupRef } from '../types';
import { useDebouncedValue } from './useDebouncedValue';

/** The picker's filter. Changing the search, the group or "only not imported" goes back to the first page. */
export function useImportFilter() {
  const [text, setTextValue] = useState('');
  const [page, setPage] = useState(1);
  const [onlyNew, setOnlyNewValue] = useState(false);
  const [group, setGroupValue] = useState<QuickAddGroupRef | undefined>();
  /** The search as the server is asked for it: trimmed, and only once the typing stops. */
  const q = useDebouncedValue(text.trim());
  return {
    text,
    q,
    page,
    onlyNew,
    group,
    setPage,
    setText: (value: string) => {
      setTextValue(value);
      setPage(1);
    },
    setOnlyNew: (value: boolean) => {
      setOnlyNewValue(value);
      setPage(1);
    },
    setGroup: (value: QuickAddGroupRef | undefined) => {
      setGroupValue(value);
      setPage(1);
    },
  };
}

/** The picker's filter, as `useImportFilter` returns it. */
export type ImportFilter = ReturnType<typeof useImportFilter>;

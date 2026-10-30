// ListToolbar: the search box, "Clear filters" and the live count above a storefront table. Ports the toolbar of the services
// table (tblToolbar in 13-b2c-ui.js); the demo's storefront tables had none, and a paged list needs a way to find a row.
// The search text is sent after a pause.
import type { ReactNode } from 'react';
import { Button, SearchInput, TableToolbar, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';

export interface ListToolbarProps {
  /** The committed search text, from the address. */
  query: string;
  onQuery: (query: string) => void;
  placeholder: string;
  /** The number of rows that match, from the server; the singular and plural noun follow it. */
  total: number | undefined;
  noun: readonly [singular: string, plural: string];
  /** Whether any search or filter is on, which shows "Clear filters". */
  filtered: boolean;
  onClear: () => void;
  /** Other filters, between the search box and the count. */
  children?: ReactNode;
}

/** Search box with a pause before the page is told, then the extra filters and the count. */
export function ListToolbar({
  query,
  onQuery,
  placeholder,
  total,
  noun,
  filtered,
  onClear,
  children,
}: ListToolbarProps) {
  const search = useDebouncedCommit(query, onQuery);
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? noun[0] : noun[1]}`}
    >
      <SearchInput value={search.text} onChange={search.setText} placeholder={placeholder} />
      {children}
      {filtered && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}

// SelectAllNotImportedBox: the "Select all not imported (N)" box in the import picker's toolbar, with its words while the ids are read.
import { num } from '@/lib/format';
import type { SelectAllNotImported } from '../hooks/useSelectAllNotImported';
import { SelectAllBox } from './SelectAllBox';

/** Ticks every service of the supplier that is not imported yet (for the search and group shown), on every page of the table. */
export function SelectAllNotImportedBox({ all }: { all: SelectAllNotImported }) {
  const empty = all.total === 0;
  let label = 'Select all not imported';
  if (all.busy) label = 'Selecting…';
  else if (all.total !== undefined) label = `${label} (${num(all.total)})`;
  return (
    <SelectAllBox
      label={label}
      state={all.state}
      disabled={empty && !all.busy}
      busy={all.busy}
      title={empty ? 'No service is waiting to be imported for this search and group.' : undefined}
      onChange={(on) => void all.toggle(on)}
    />
  );
}

// QuickSearch: the bordered "Quick Search" box above the list: [Select Group] [Search service from any group] [Search], and after them
// our two filters, [Any API] (the primary supplier connection) and [Show: All services]. The menus apply at once, together with the text
// typed so far; Search (or Enter) applies the text. Every choice goes to the address, so a link, a reload and Back keep it.
import { useState } from 'react';
import { LegendBox, QuickSearchText, SelectField, type SelectOption } from '@/components/ui';
import { parseRecordId } from '../../../lib/productsPath';
import type { NamedRef, ServiceCategory } from '../../../types';
import { showOptions, usableShow, type AllAddress, type AllShow } from './allAddress';

export interface QuickSearchProps {
  address: AllAddress;
  /** The groups of the kind on the strip. */
  groups: readonly ServiceCategory[];
  /** The suppliers to filter by; the menu is locked with the reason when the role may not read suppliers. */
  suppliers: readonly NamedRef[];
  supplierLock: { disabled: boolean; title?: string };
  /** The role may read the shop: "Not on the shop" is offered. */
  storefront: boolean;
  /** Goes to the list with these keys changed. */
  onApply: (patch: Partial<AllAddress>) => void;
}

/**
 * A menu's options: the empty choice first, then the names. An id from the address that is not in the list (a group of another kind, a
 * supplier the role may not read, a list still loading) still shows, by number, so the filter is never on out of sight.
 */
function menuOptions(
  empty: string,
  noun: string,
  names: readonly NamedRef[],
  value: number | null,
): SelectOption[] {
  const options: SelectOption[] = [
    { value: '', label: empty },
    ...names.map((n) => ({ value: n.id, label: n.name })),
  ];
  if (value !== null && !names.some((n) => n.id === value))
    options.push({ value, label: `${noun} #${value}` });
  return options;
}

/** The box. The text is a draft until Search or Enter; the address always holds what the list shows. */
export function QuickSearch({
  address,
  groups,
  suppliers,
  supplierLock,
  storefront,
  onApply,
}: QuickSearchProps) {
  const [draft, setDraft] = useState(address.q);
  // The address moved under the box (Back, a link, Clear the search): the box shows what the list shows.
  const [seen, setSeen] = useState(address.q);
  if (address.q !== seen) {
    setSeen(address.q);
    setDraft(address.q);
  }
  const apply = (patch: Partial<AllAddress>) => onApply({ q: draft, ...patch });

  return (
    <LegendBox legend="Quick Search">
      <SelectField
        aria-label="Group"
        options={menuOptions('Select Group', 'Group', groups, address.group)}
        value={address.group ?? ''}
        selectWrapClassName="w-full sm:w-auto sm:min-w-[10rem] sm:max-w-[40rem] sm:flex-1"
        onChange={(event) => apply({ group: parseRecordId(event.target.value) })}
      />
      <QuickSearchText
        className="sm:min-w-[17rem]"
        value={draft}
        onChange={setDraft}
        onSearch={() => apply({})}
        placeholder="Search service from any group"
      />
      <SelectField
        aria-label="API"
        options={menuOptions('Any API', 'API', suppliers, address.api)}
        value={address.api ?? ''}
        disabled={supplierLock.disabled}
        title={supplierLock.title}
        selectWrapClassName="w-full sm:w-44"
        onChange={(event) => apply({ api: parseRecordId(event.target.value) })}
      />
      <SelectField
        aria-label="Show"
        options={showOptions({ storefront })}
        value={usableShow(address.show, { storefront }) ?? ''}
        selectWrapClassName="w-full sm:w-48"
        onChange={(event) => apply({ show: (event.target.value || null) as AllShow | null })}
      />
    </LegendBox>
  );
}

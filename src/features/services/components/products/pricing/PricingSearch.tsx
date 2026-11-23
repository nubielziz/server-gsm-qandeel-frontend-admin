// PricingSearch: the Quick Search box above the price grid: the search text, the group (category) of the kind, the currency ("USD - Base", the
// only one), and at the right the two checkboxes that change the grid: "Display Enable/Disable Service" (a box per row that switches the
// service at once) and "Set Order" (a position box per row and a Save order button).
import { CheckboxField, LegendBox, SearchInput, SelectField, useDebouncedCommit } from '@/components/ui';
import type { Id } from '@/lib/api';

export interface PricingSearchProps {
  /** The search text in the address. */
  q: string;
  onSearch: (text: string) => void;
  /** The group in the address, and the groups of the kind to choose from. */
  group: Id | undefined;
  groups: readonly { id: Id; name: string }[];
  onGroup: (group: Id | undefined) => void;
  display: boolean;
  onDisplay: (on: boolean) => void;
  ordering: boolean;
  onOrdering: (on: boolean) => void;
  /** Locks of the two checkboxes (they need `catalog:update`). */
  lock: { disabled: boolean; title?: string };
}

/** The box. The text is sent to the address after a short pause. */
export function PricingSearch({
  q,
  onSearch,
  group,
  groups,
  onGroup,
  display,
  onDisplay,
  ordering,
  onOrdering,
  lock,
}: PricingSearchProps) {
  const { text, setText } = useDebouncedCommit(q, onSearch);
  return (
    <LegendBox legend="Quick Search">
      <SearchInput value={text} onChange={setText} placeholder="Search Service" />
      <SelectField
        aria-label="Group"
        selectWrapClassName="w-full min-w-[12rem] max-w-md"
        value={group ?? ''}
        options={[
          { value: '', label: 'Select Group' },
          ...groups.map(({ id, name }) => ({ value: id, label: name })),
        ]}
        onChange={(event) => onGroup(event.target.value === '' ? undefined : Number(event.target.value))}
      />
      <SelectField
        aria-label="Currency"
        defaultValue="usd"
        options={[{ value: 'usd', label: 'USD - Base' }]}
      />
      <div className="ms-auto flex flex-wrap items-center gap-x-5 gap-y-1">
        <CheckboxField
          label="Display Enable/Disable Service"
          checked={display}
          disabled={lock.disabled}
          title={lock.title}
          onChange={(event) => onDisplay(event.target.checked)}
        />
        <CheckboxField
          label="Set Order"
          checked={ordering}
          disabled={lock.disabled}
          title={lock.title}
          onChange={(event) => onOrdering(event.target.checked)}
        />
      </div>
    </LegendBox>
  );
}

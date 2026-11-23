// CatalogChips: the lists above the Catalog table, with the server's counts: All, Needs attention, Not on the shop, Switched off. A chip
// is a list of its own (`?chip=`), not a toolbar filter. "Not on the shop" needs `storefront:read` (the server refuses its filter
// otherwise), so it is not offered without it. The counts are global, as the demo's were: they match the table when no filter is on.
import { SectionTabs, type TabItem } from '@/components/ui';
import type { ChipCounts } from '../../hooks/useServiceCounts';
import type { CatalogChip } from '../../lib/filters';

type ChipValue = Exclude<CatalogChip, ''> | 'all';

export interface CatalogChipsProps {
  value: CatalogChip;
  counts: ChipCounts;
  /** The role may read the shop: the "Not on the shop" chip is offered. */
  storefront: boolean;
  onChange: (chip: CatalogChip) => void;
}

/** The chip strip; "All" is the list with no `chip` in the address. */
export function CatalogChips({ value, counts, storefront, onChange }: CatalogChipsProps) {
  const items: TabItem<ChipValue>[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'attention', label: 'Needs attention', count: counts.attention },
    ...(storefront
      ? [{ value: 'notonshop' as const, label: 'Not on the shop', count: counts.notonshop }]
      : []),
    { value: 'off', label: 'Switched off', count: counts.off },
  ];
  return (
    <SectionTabs
      items={items}
      value={value || 'all'}
      onChange={(next) => onChange(next === 'all' ? '' : next)}
      label="Service lists"
    />
  );
}

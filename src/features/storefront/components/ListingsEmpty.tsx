// ListingsEmpty: what the listings table says when it has no rows: no listings at all, or none that match the search. Ports the
// `empty` of tabListings in 50-p-storefront.js.
import { Button, EmptyState } from '@/components/ui';

export interface ListingsEmptyProps {
  /** No listing exists at all (no search is on and the list is empty). */
  noListings: boolean;
  onClear: () => void;
}

/** Picks the empty state that is true: no listings at all, or none that match. */
export function ListingsEmpty({ noListings, onClear }: ListingsEmptyProps) {
  if (noListings) {
    return (
      <EmptyState icon="tag" title="No services yet">
        Add IMEI services under Services &amp; pricing, then list them here.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="filter"
      title="No listings match"
      cta={<Button onClick={onClear}>Clear filters</Button>}
    >
      Try another search.
    </EmptyState>
  );
}

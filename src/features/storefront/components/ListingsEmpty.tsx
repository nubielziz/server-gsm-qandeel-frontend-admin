// ListingsEmpty: what the listings table says when it has no rows: no listings at all, or none that match the search. Ports the
// `empty` of tabListings in 50-p-storefront.js.
import type { ReactNode } from 'react';
import { Button, EmptyState } from '@/components/ui';

export interface ListingsEmptyProps {
  /** No listing exists at all (no search is on and the list is empty). */
  noListings: boolean;
  onClear: () => void;
  /** The "Publish services…" button: the call to action of an empty shop. */
  publish?: ReactNode;
}

/** Picks the empty state that is true: no listings at all, or none that match. */
export function ListingsEmpty({ noListings, onClear, publish }: ListingsEmptyProps) {
  if (noListings) {
    return (
      <EmptyState icon="tag" title="No services yet" cta={publish}>
        Add services in the Catalog or under Suppliers, then publish them to the shop.
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

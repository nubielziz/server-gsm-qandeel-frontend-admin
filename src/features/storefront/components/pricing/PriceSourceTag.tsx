// PriceSourceTag: the small marks under a listing's storefront price: "Rule" when a retail pricing rule wrote the price (its words
// in the tooltip) and an amber "Waiting" while a price change waits for a person on the Retail pricing tab. A typed price has none.
import { Badge, TypeTag } from '@/components/ui';
import type { ServiceListing } from '../../types';

/** Nothing for a typed price that nobody waits on; the figures and the words come from the server. */
export function PriceSourceTag({
  listing,
}: {
  listing: Pick<ServiceListing, 'retailPriceSource' | 'retailPriceRule' | 'retailPriceWaiting'>;
}) {
  const byRule = listing.retailPriceSource === 'rule';
  if (!byRule && !listing.retailPriceWaiting) return null;
  return (
    <span className="mt-0.5 flex flex-wrap justify-end gap-1">
      {byRule && (
        <span title={listing.retailPriceRule?.label}>
          <TypeTag>Rule</TypeTag>
        </span>
      )}
      {listing.retailPriceWaiting && (
        <Badge tone="warn" icon="clock">
          Waiting
        </Badge>
      )}
    </span>
  );
}

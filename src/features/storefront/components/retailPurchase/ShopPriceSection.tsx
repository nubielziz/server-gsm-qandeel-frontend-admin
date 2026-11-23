// ShopPriceSection: the "Shop price" section of the Retail Purchase part: the price form when the service has a shop page, the price read-only
// when it has none, and the waiting price change with Apply and Keep (it needs pricing:read).
import { SectionHeading, type ReportSection } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { ServiceListingDetail } from '../../types';
import { ShopProposal } from '../shop/ShopProposal';
import { PriceForm } from './PriceForm';
import { PriceReadOnly } from './PriceReadOnly';
import type { RetailPurchasePartProps } from './types';

export interface ShopPriceSectionProps {
  serviceId: Id;
  listingId: Id | null;
  /** The listing once it is read. */
  listing?: ServiceListingDetail;
  grants: StorefrontGrants;
  retailPrice?: RetailPurchasePartProps['retailPrice'];
  retailPriceSource?: RetailPurchasePartProps['retailPriceSource'];
  report: ReportSection;
}

/**
 * Without a shop page the record's own price is shown read-only (it is not hidden from any reader of the catalog); with one, the form.
 * The waiting price change is the service's, with or without a shop page.
 */
export function ShopPriceSection({
  serviceId,
  listingId,
  listing,
  grants,
  retailPrice,
  retailPriceSource,
  report,
}: ShopPriceSectionProps) {
  let price;
  if (listingId === null) {
    price = <PriceReadOnly retailPrice={retailPrice} retailPriceSource={retailPriceSource} />;
  } else if (listing && grants.ready) {
    price = <PriceForm key={listing.id} listing={listing} grants={grants} report={report} />;
  } else {
    price = <p className="hint">Loading the shop price…</p>;
  }
  return (
    <>
      <SectionHeading>Shop price</SectionHeading>
      {price}
      {grants.ready && grants.can('pricing:read') && <ShopProposal serviceId={serviceId} grants={grants} />}
    </>
  );
}

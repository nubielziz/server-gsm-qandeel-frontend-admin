// ShopPageSection: the "Shop page" section of the Retail Purchase part: the listing form (saved in place) when the service has a shop page,
// else one line saying the page does not exist yet.
import { FormRow, ReadValue, SectionHeading, type ReportSection } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { ServiceListingDetail } from '../../types';
import { PageForm } from './PageForm';

export interface ShopPageSectionProps {
  listingId: Id | null;
  /** The listing once it is read. */
  listing?: ServiceListingDetail;
  grants: StorefrontGrants;
  report: ReportSection;
}

/** A listing that is still being read shows a short line; a failed read is shown once by the part above. */
export function ShopPageSection({ listingId, listing, grants, report }: ShopPageSectionProps) {
  let page;
  if (listingId === null) {
    page = (
      <FormRow label="Shop page" hint="The page is made when the service goes on the shop.">
        <ReadValue muted>None yet</ReadValue>
      </FormRow>
    );
  } else if (listing && grants.ready) {
    page = <PageForm key={listing.id} listing={listing} grants={grants} report={report} />;
  } else {
    page = <p className="hint">Loading the shop page…</p>;
  }
  return (
    <>
      <SectionHeading>Shop page</SectionHeading>
      {page}
    </>
  );
}

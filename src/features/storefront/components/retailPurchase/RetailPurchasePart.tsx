// RetailPurchasePart: the "Retail Purchase" part of the Product / Services edit view for one service, as label-left sections that are each
// saved on their own: On the shop (the one switch and why not), Shop price (follow the rule or a typed price), the waiting price change
// (Apply and Keep) and Shop page (the listing form). Server figures and words only. It takes plain values (no import from the services
// feature), which the services feature's adapter reads from the service record.
import { ErrorState, useDirtySections } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useListing } from '../../hooks/useListing';
import { useStorefrontGrants } from '../../hooks/useStorefrontGrants';
import { OnShopSection } from './OnShopSection';
import { ShopPageSection } from './ShopPageSection';
import { ShopPriceSection } from './ShopPriceSection';
import type { RetailPurchasePartProps } from './types';

/** The part's sections once the role may read the shop. The listing is read by id here, once, for every section that needs it. */
function RetailPurchaseSections({
  serviceId,
  serviceName,
  listingId,
  isListed,
  shopBlocked,
  retailPrice,
  retailPriceSource,
  publishFailure,
  switchSlot,
  onDirtyChange,
}: RetailPurchasePartProps & { listingId: Id | null }) {
  const grants = useStorefrontGrants();
  const detail = useListing(listingId);
  const report = useDirtySections(onDirtyChange);
  const listing = detail.data;
  const unreadable = listingId !== null && detail.isError && !listing;
  return (
    <section aria-label={`Retail purchase of ${serviceName}`} className="min-w-0">
      <OnShopSection
        listingId={listingId}
        listing={listing}
        isListed={isListed}
        shopBlocked={shopBlocked}
        publishFailure={publishFailure}
        switchSlot={switchSlot}
      />
      {unreadable ? (
        <ErrorState
          title="Could not load the shop page"
          error={detail.error}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <>
          <ShopPriceSection
            serviceId={serviceId}
            listingId={listingId}
            listing={listing}
            grants={grants}
            retailPrice={retailPrice}
            retailPriceSource={retailPriceSource}
            report={report}
          />
          <ShopPageSection listingId={listingId} listing={listing} grants={grants} report={report} />
        </>
      )}
    </section>
  );
}

/**
 * The Retail Purchase part. A role without storefront:read (`listingId` left out) sees one line saying so and nothing is read. The state of
 * each form is gathered into `onDirtyChange`, so the editor can ask before another part or view is opened; a part is made new for
 * another service or another shop page, so what was typed for the old one is gone.
 */
export function RetailPurchasePart(props: RetailPurchasePartProps) {
  const { listingId, serviceId } = props;
  if (listingId === undefined) {
    return (
      <p className="hint">The shop page is hidden: you need the storefront:read permission to see it.</p>
    );
  }
  return <RetailPurchaseSections key={`${serviceId}:${listingId}`} {...props} listingId={listingId} />;
}

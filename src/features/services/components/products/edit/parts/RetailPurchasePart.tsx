// RetailPurchasePart: the "Retail Purchase" part of the edit view (whether the service is on the shop, its shop price, a waiting price change
// and the shop page). The part itself belongs to the storefront feature; this is the thin adapter that reads the shop facts from the service
// record and hands over the services feature's one shop switch as the part's switch slot.
import { RetailPurchasePart as ShopPart } from '@/features/storefront';
import type { ServicePartProps } from '../../types';
import { ShopSwitch } from './ShopSwitch';

/**
 * The shop keys of the record are left out for a role without storefront:read, which the part reads as "not allowed" (one line, nothing
 * read); its registry row already asks for that permission. The switch is drawn only when the shop facts are known.
 */
export function RetailPurchasePart({ service, grants, onDirtyChange }: ServicePartProps) {
  return (
    <ShopPart
      serviceId={service.id}
      serviceName={service.name}
      listingId={service.listingId}
      isListed={service.isListed}
      shopBlocked={service.shopBlocked}
      retailPrice={service.retailPrice}
      retailPriceSource={service.retailPriceSource}
      publishFailure={service.publishFailure}
      switchSlot={
        service.listingId === undefined ? undefined : <ShopSwitch service={service} grants={grants} />
      }
      onDirtyChange={onDirtyChange}
    />
  );
}

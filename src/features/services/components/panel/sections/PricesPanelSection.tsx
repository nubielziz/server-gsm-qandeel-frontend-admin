// PricesPanelSection: the panel's "Prices" section: the merchant price and the group prices (PricesSection) with the storefront's shop
// price block in its slot. The two parts report unsaved changes apart; the panel hears one answer for the section.
import { ShopPriceBlock } from '@/features/storefront';
import { usePricesDirty } from '../../../hooks/usePricesDirty';
import type { PanelSectionProps } from '../types';
import { PricesSection } from './PricesSection';

/**
 * The prices of the open service. `listingId` goes to the shop block unchanged: absent for a role without storefront:read, null for a
 * service with no shop page. The row's shop price and its source go too (the server sends them to every reader), so the block can
 * show the price where it has no form for it.
 */
export function PricesPanelSection({ service, grants, active, onDirtyChange }: PanelSectionProps) {
  // usePricesDirty joins two dirty flags into one: here the section's two forms (already joined) and the shop price block.
  const { setMerchant: setPrices, setGroups: setShop } = usePricesDirty(onDirtyChange);
  return (
    <PricesSection
      service={service}
      grants={grants}
      active={active}
      onDirtyChange={setPrices}
      shopSlot={
        <ShopPriceBlock
          serviceId={service.id}
          listingId={service.listingId}
          retailPrice={service.retailPrice}
          retailPriceSource={service.retailPriceSource}
          onDirtyChange={setShop}
        />
      }
    />
  );
}

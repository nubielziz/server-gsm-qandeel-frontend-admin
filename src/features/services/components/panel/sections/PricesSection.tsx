// PricesSection: the Prices section of the service panel. Two forms that save on their own: the merchant price with its minimum profit,
// and the group prices; between them a slot for the shop price block. Its permissions are per control, so a role may hold only part.
import { useId, type ReactNode } from 'react';
import { usePricesDirty } from '../../../hooks/usePricesDirty';
import type { PanelSectionProps } from '../types';
import { GroupPricesPart } from './GroupPricesPart';
import { MerchantPriceForm } from './MerchantPriceForm';

/** What the section takes besides the contract's props. */
export type PricesSectionProps = PanelSectionProps & {
  /** The shop price block, shown under the small heading "Shop price" between the two forms. Nothing is drawn when it is left out. */
  shopSlot?: ReactNode;
};

/** A small heading over one block of the section. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="space-y-2">
      <h4 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-ink3">
        {title}
      </h4>
      {children}
    </div>
  );
}

/**
 * The content of the section; the panel draws its heading and frame (and scrolls to it when the address names it). It reports dirty
 * when either form holds an unsaved change. The slot sits between the two forms, never inside one, so a slot with a form of its own
 * is not nested in another form.
 */
export function PricesSection({ service, grants, onDirtyChange, shopSlot }: PricesSectionProps) {
  const { setMerchant, setGroups } = usePricesDirty(onDirtyChange);
  const hasShop = shopSlot != null && shopSlot !== false;
  return (
    <div className="space-y-5">
      <Block title="Merchant price">
        <MerchantPriceForm service={service} grants={grants} onDirtyChange={setMerchant} />
      </Block>
      {hasShop && <Block title="Shop price">{shopSlot}</Block>}
      <Block title="Group prices">
        <GroupPricesPart
          service={service}
          grants={grants}
          note={hasShop ? 'The shop price has its own block above.' : undefined}
          onDirtyChange={setGroups}
        />
      </Block>
    </div>
  );
}

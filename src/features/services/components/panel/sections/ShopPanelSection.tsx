// ShopPanelSection: the panel's "Shop page" section: the storefront's ShopPageSection given the shop facts of the row (listing, on
// the shop, why it cannot go there), the failed publish from the service's detail, and the table's one "On the shop" switch.
import { ShopPageSection } from '@/features/storefront';
import { useServiceDetail } from '../../../hooks/useServiceDetail';
import { OnShopSwitch } from '../../table/OnShopSwitch';
import type { PanelSectionProps } from '../types';

/** The shop page of the open service. The panel shows it only to a role with storefront:read, which the row's shop keys need too. */
export function ShopPanelSection({ service, grants, active, onDirtyChange }: PanelSectionProps) {
  // The detail is the panel host's read of the same service; the failed publish is on the detail only, never on the row.
  const { detail } = useServiceDetail(service.id);
  const publishFailure = detail?.id === service.id ? detail.publishFailure : undefined;
  return (
    <ShopPageSection
      serviceId={service.id}
      listingId={service.listingId}
      isListed={service.isListed}
      shopBlocked={service.shopBlocked}
      publishFailure={publishFailure}
      switchSlot={<OnShopSwitch service={service} grants={grants} />}
      active={active}
      onDirtyChange={onDirtyChange}
    />
  );
}

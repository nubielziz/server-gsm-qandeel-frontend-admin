// ShopSwitch: the one "On the shop" switch of a service as the Retail Purchase part draws it, a Yes | No control. It is the same logic as the
// All view's Shop square (usePutOnShop): a shop page is switched on or off, and a service without one goes on the shop through a run of that
// one service, applied only when the server says its row is ready. The outcome and the server's reason are told in a toast.
import { YesNo } from '@/components/ui';
import type { ServiceGrants } from '../../../../hooks/useServiceGrants';
import { usePutOnShop } from '../../../../hooks/usePutOnShop';
import { shopBusyWords, shopLock } from '../../../../lib/shopSwitch';
import type { Service } from '../../../../types';

export interface ShopSwitchProps {
  service: Service;
  grants: ServiceGrants;
}

/**
 * Locked with the reason when the server says the service cannot go on the shop (the part says why in its Status row) or the role may not
 * make the move (the missing permission is written beside the switch). While it works it waits and says so.
 */
export function ShopSwitch({ service, grants }: ShopSwitchProps) {
  const { toggle, isBusy } = usePutOnShop();
  const lock = shopLock(service, grants);
  const listed = service.isListed === true;
  const busy = isBusy(service.id);
  // A service the server keeps off the shop is explained in the Status row above; only a missing permission is written here.
  const permission = lock.disabled && !(service.shopBlocked && !listed) ? lock.title : undefined;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 md:min-h-8">
      <YesNo
        aria-label="On the shop"
        value={listed}
        disabled={lock.disabled || busy}
        title={lock.title}
        onChange={(on) => toggle(service, on)}
      />
      {busy && (
        <span className="cell-sub" role="status">
          {shopBusyWords(service)}
        </span>
      )}
      {permission && <span className="hint">{permission}</span>}
    </span>
  );
}

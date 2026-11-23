// The two square switches of a row of the All view. Status switches the service on or off (merchants can order an active one); Shop
// puts the service on the shop or takes it off, through the one switch of the shop (`usePutOnShop`), which tells the outcome and the
// server's reason in a toast. Each keeps its permission lock and its hint; the server still checks every call.
import { SquareToggle } from '@/components/ui';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import { shopBusyWords, shopLock } from '../../../lib/shopSwitch';
import type { Service } from '../../../types';

export interface StatusCellProps {
  service: Service;
  grants: ServiceGrants;
  /** The row's status is saving: the square waits and a second press does nothing. */
  busy: boolean;
  onToggle: (service: Service) => void;
}

/** A green square when the service is active, a hollow one when it is switched off; a button that flips it. */
export function StatusCell({ service, grants, busy, onToggle }: StatusCellProps) {
  const lock = grants.needs('catalog:update');
  const on = service.status === 'active';
  return (
    <SquareToggle
      on={on}
      busy={busy}
      disabled={lock.disabled}
      label={`${service.name} active`}
      title={lock.title ?? (on ? 'Active. Press to switch it off.' : 'Switched off. Press to switch it on.')}
      onToggle={() => onToggle(service)}
    />
  );
}

export interface ShopCellProps {
  service: Service;
  grants: ServiceGrants;
  /** The row's switch is working (a publish run or a save): it waits and cannot be pressed again. */
  busy: boolean;
  onToggle: (service: Service, on: boolean) => void;
}

/** What the square's hover text says when nothing is locked. */
function shopWord(service: Service, busy: boolean): string {
  const hasPage = service.listingId != null;
  if (busy) return shopBusyWords(service);
  if (service.isListed === true) return 'On the shop. Press to take it off.';
  return hasPage ? 'Off the shop. Press to put it back.' : 'Not on the shop. Press to put it there.';
}

/**
 * A green square when the service is on the shop, as narrow as the Status square. When the server says it cannot go on the shop
 * (`shopBlocked`) the square is locked and its hover text is the reason (the name cell writes the same words under the name). A press
 * on a service with no shop page starts a one-service publish run that is applied only when the server says its row is ready; what
 * the switch is doing is told to a screen reader, not drawn, so the column does not move.
 */
export function ShopCell({ service, grants, busy, onToggle }: ShopCellProps) {
  const lock = shopLock(service, grants);
  const listed = service.isListed === true;
  return (
    <>
      <SquareToggle
        on={listed}
        busy={busy}
        disabled={lock.disabled}
        label={`${service.name} on the shop`}
        title={lock.title ?? shopWord(service, busy)}
        onToggle={() => onToggle(service, !listed)}
      />
      {busy && (
        <span className="sr-only" role="status">
          {shopBusyWords(service)}
        </span>
      )}
    </>
  );
}

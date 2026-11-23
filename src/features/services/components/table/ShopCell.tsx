// ShopCell: the one "On the shop" switch of a Catalog row, with a word beside it. With a shop page it switches the page on or off; without
// one it puts the service on the shop through a publish run (usePutOnShop); when the server says the service cannot go on the shop
// (`shopBlocked`) it is disabled and the reason is written beside it. Each direction keeps its own permissions; the server checks them.
import { cx, Switch } from '@/components/ui';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import { SHOP_BLOCK_WORDS, shopLock } from '../../lib/shopSwitch';
import type { Service } from '../../types';

export interface ShopCellProps {
  service: Service;
  grants: ServiceGrants;
  /** The row's switch is working (a publish run or a save): it waits and cannot be pressed again. */
  busy: boolean;
  onToggle: (service: Service, on: boolean) => void;
}

/** What the word beside the switch says. */
function wordOf(service: Service, busy: boolean): string {
  const hasPage = service.listingId != null;
  if (busy) return hasPage ? 'Saving…' : 'Putting it on the shop…';
  if (service.shopBlocked) return SHOP_BLOCK_WORDS[service.shopBlocked];
  if (service.isListed === true) return 'On the shop';
  return hasPage ? 'Off the shop' : 'Not on the shop';
}

/** The switch and its word. */
export function ShopCell({ service, grants, busy, onToggle }: ShopCellProps) {
  const lock = shopLock(service, grants);
  return (
    <span className="inline-flex items-center gap-2">
      <Switch
        checked={service.isListed === true}
        label={`${service.name} on the shop`}
        disabled={lock.disabled || busy}
        title={lock.title}
        aria-busy={busy || undefined}
        onChange={(on) => onToggle(service, on)}
      />
      <span className={cx('text-xs', service.shopBlocked ? 'text-ink3' : 'text-ink2')} aria-live="polite">
        {wordOf(service, busy)}
      </span>
    </span>
  );
}

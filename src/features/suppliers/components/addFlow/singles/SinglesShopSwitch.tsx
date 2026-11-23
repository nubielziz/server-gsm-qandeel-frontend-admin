// SinglesShopSwitch: the switch "Prepare them for the shop" on the last step of the single-services path, with what it does and, when
// it cannot be turned on, the reason (a missing permission, or no shop price rule).
import { Link } from 'react-router';
import { Switch } from '@/components/ui';
import { storefrontPricingPath } from '@/features/storefront';
import type { ShopSwitchState } from '../../../hooks/useSinglesShopRule';

export interface SinglesShopSwitchProps {
  on: boolean;
  onChange: (on: boolean) => void;
  /** What the switch may do: held back for a missing permission or rule. */
  shop: ShopSwitchState;
  /** The import has begun: the batches were sent with this choice, so it stays. */
  fixed: boolean;
  /** Called when a link of the switch is followed, so the flow closes before the page changes. */
  onNavigate: () => void;
}

/** The switch and its two lines: what it does, and why it is held back. Turning it on never publishes anything by itself. */
export function SinglesShopSwitch({ on, onChange, shop, fixed, onNavigate }: SinglesShopSwitchProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line p-3">
      <Switch
        checked={on && !shop.blocked}
        onChange={onChange}
        label="Prepare them for the shop"
        disabled={shop.blocked || fixed}
        title={shop.reason}
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">Prepare them for the shop</p>
        <p className="text-ink2">
          After each batch the server prepares a shop preview of the services it added. Nothing goes on the
          shop until you review the preview and publish it.
        </p>
        {shop.reason && (
          <p className="mt-1 text-xs text-ink3">
            {shop.reason}
            {shop.noRule && (
              <>
                {' '}
                <Link className="underline" to={storefrontPricingPath()} onClick={onNavigate}>
                  Open the shop price rules
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

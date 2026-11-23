// GroupsShopSwitch: the switch "Put them on the shop now" of the Add services flow, with the hint about what the server does and, when
// the switch is locked, the reason in words (also its title) and a link to the shop price rules when none is active.
import { useId } from 'react';
import { Link } from 'react-router';
import { Switch } from '@/components/ui';
import { storefrontPricingPath } from '@/features/storefront';
import { SHOP_SWITCH_HINT, type ShopRule } from '../../../lib/quickAddFlow';

export interface GroupsShopSwitchProps {
  checked: boolean;
  /** Why the switch cannot be used; `undefined` when it can. */
  lock: string | undefined;
  rule: ShopRule;
  onChange: (on: boolean) => void;
}

/** The switch with its words. A locked switch is off and says why. */
export function GroupsShopSwitch({ checked, lock, rule, onChange }: GroupsShopSwitchProps) {
  const id = useId();
  return (
    <div className="rounded-md border border-line2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Switch
          id={id}
          label="Put them on the shop now"
          checked={checked}
          disabled={lock !== undefined}
          title={lock}
          aria-describedby={`${id}-hint`}
          onChange={onChange}
        />
        <label htmlFor={id} className="text-sm font-medium">
          Put them on the shop now
        </label>
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink3">
        {SHOP_SWITCH_HINT}
      </p>
      {lock !== undefined && (
        <p className="mt-1.5 text-xs text-ink2">
          {lock}
          {rule === 'none' && (
            <>
              {' '}
              <Link className="link" to={storefrontPricingPath()}>
                Open the shop price rules
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}

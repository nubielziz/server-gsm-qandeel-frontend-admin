// ShopPriceReadOnly: the shop price of a service the panel cannot edit here: one that has no shop page, or whose shop page the role may
// not read. It shows the price the row carries with how it was set (Rule or Typed), or "None". Every figure is the server's.
import { TypeTag } from '@/components/ui';
import type { Money } from '@/lib/api';
import { money } from '@/lib/format';
import type { RetailPriceSource } from '../../types';

export interface ShopPriceReadOnlyProps {
  /** The shop price of the row (every reader of the catalog gets it); `null` or left out for none. */
  retailPrice?: Money | null;
  /** Who wrote it: a shop price rule, or a person (`manual`). */
  retailPriceSource?: RetailPriceSource | null;
  /** True when the service is known to have no shop page: a stored price is then kept when it goes on the shop. */
  noShopPage: boolean;
}

/** The price with its tag, and one line about what happens to it when the service goes on the shop. */
export function ShopPriceReadOnly({ retailPrice, retailPriceSource, noShopPage }: ShopPriceReadOnlyProps) {
  if (retailPrice == null) return <p className="text-sm text-ink3">None</p>;
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{money(retailPrice)}</span>
        {retailPriceSource === 'rule' && <TypeTag>Rule</TypeTag>}
        {retailPriceSource === 'manual' && <TypeTag>Typed</TypeTag>}
      </p>
      {noShopPage && <p className="hint">It is kept when the service goes on the shop.</p>}
    </div>
  );
}

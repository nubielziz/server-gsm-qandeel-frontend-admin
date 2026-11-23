// ShopPriceCell: a Catalog row's shop price with its source: "Rule" when a shop price rule wrote it (the rule's words in the tooltip),
// "Typed" when a person typed it, and an amber "Waiting" while a proposed new price waits for a person. Every figure and fact is the
// server's; the waiting mark follows the server's attention reason, as its own read of the flag skips services without a price.
import { Badge, TypeTag } from '@/components/ui';
import { money } from '@/lib/format';
import type { Service } from '../../types';

/** The price (or "None") and its tags. */
export function ShopPriceCell({ service }: { service: Service }) {
  const price = service.retailPrice ?? null;
  const waiting =
    service.attention?.includes('price_proposal') === true || service.retailPriceWaiting === true;
  const source = price === null ? null : (service.retailPriceSource ?? null);
  return (
    <>
      {price === null ? <span className="text-ink3">None</span> : money(price)}
      {(source !== null || waiting) && (
        <span className="mt-0.5 flex flex-wrap justify-end gap-1">
          {source === 'rule' && (
            <span title={service.retailPriceRule?.label}>
              <TypeTag>Rule</TypeTag>
            </span>
          )}
          {source === 'manual' && <TypeTag>Typed</TypeTag>}
          {waiting && (
            <Badge tone="warn" icon="clock">
              Waiting
            </Badge>
          )}
        </span>
      )}
    </>
  );
}

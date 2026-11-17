// The cells a publish row is drawn with, in the result table of a finished run (and in the preview of a draft): the service
// with its clean title and the supplier's raw name, the three facts, the shop price with its tag, and whether the listing is on
// the shop now. Every word and figure is the server's; the price is shown as sent, never worked out here.
import { Badge, TypeTag } from '@/components/ui';
import { price } from '@/lib/format';
import type { Money } from '@/lib/api';
import type { PublishItem, PublishPriceMode } from '../../types';

/** The clean title, then (muted) the supplier's own name, then the code and the address. The raw name may hold any script. */
export function PublishServiceCell({ item }: { item: PublishItem }) {
  return (
    <div className="min-w-0 max-w-[26rem]">
      <p className="font-medium">{item.title || <span className="text-ink3">No title</span>}</p>
      <p className="truncate text-xs text-ink3" dir="auto" title={item.service.name}>
        {item.service.name}
      </p>
      <p className="mono text-xs text-ink3">
        {item.service.code}
        {item.slug && ` /${item.slug}`}
      </p>
    </div>
  );
}

/** "Apple · AT&T · US": the three facts that are set; "–" when none is. */
export function PublishFacts({ item }: { item: PublishItem }) {
  const facts = [item.brand, item.carrier, item.country].filter(Boolean);
  return <span>{facts.length > 0 ? facts.join(' · ') : '–'}</span>;
}

/** Where the price comes from, as the tag under it. */
const PRICE_TAG: Record<PublishPriceMode, string> = { rule: 'Rule', manual: 'Typed', keep: 'Kept' };

/**
 * The shop price (`amount`, or "–"), "Floor $x" under it, a tag for where it comes from and, for a row that replaces a typed
 * price, "replaces $x". `amount` is the price apply would store, or the price a published row got.
 */
export function PublishPriceCell({ item, amount }: { item: PublishItem; amount: Money | null }) {
  return (
    <div className="text-end">
      <p className="tabular-nums">{amount === null ? '–' : price(amount)}</p>
      <p className="text-xs text-ink3">Floor {price(item.floorPrice)}</p>
      <span className="mt-0.5 flex flex-wrap justify-end gap-1">
        {amount !== null && <TypeTag>{PRICE_TAG[item.priceMode]}</TypeTag>}
        {item.replacesPrice !== null && (
          <span className="text-xs text-ink3">replaces {price(item.replacesPrice)}</span>
        )}
      </span>
    </div>
  );
}

/** Whether the row's listing is on the shop now (a join the server makes); "–" for a row with no listing. */
export function PublishOnShopCell({ item }: { item: PublishItem }) {
  if (item.listingListed === null) return <span className="text-ink3">–</span>;
  return item.listingListed ? (
    <Badge tone="good" icon="check">
      On
    </Badge>
  ) : (
    <Badge tone="neutral" icon="ban">
      Off
    </Badge>
  );
}

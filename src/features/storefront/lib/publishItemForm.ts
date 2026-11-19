// The form of one preview row (`PublishItemDialog`): what its fields start with, and the body of the `PATCH` that carries only the
// keys staff changed. The console works out nothing: the price choice is the server's `priceMode`, the prices shown are the
// server's, and the typed price goes back as text (`toMoneyText` only pads it to four decimals).
import type { PublishItem, PublishPriceMode, UpdatePublishItemBody } from '../types';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from './money';

/** The dialog's fields: the facts, the address, and the choice of price with the typed price. */
export type ItemValues = {
  title: string;
  slug: string;
  brand: string;
  carrier: string;
  country: string;
  price: PublishPriceMode;
  retailPrice: string;
};

/** The fields as the row has them now. A typed price starts with the price the row would store. */
export function itemValues(item: PublishItem): ItemValues {
  return {
    title: item.title,
    slug: item.slug,
    brand: item.brand,
    carrier: item.carrier,
    country: item.country,
    price: item.priceMode,
    retailPrice: item.priceMode === 'manual' && item.retailPrice ? moneyInput(item.retailPrice) : '',
  };
}

const TEXT_KEYS = ['title', 'slug', 'brand', 'carrier', 'country'] as const;

/**
 * The body of the `PATCH`: only the keys that differ from the row. The price keys go only when `canPrice` (a role without
 * `storefront:update` cannot send them), and a price choice that is the row's own sends nothing. An empty body means nothing changed.
 */
export function itemBody(values: ItemValues, item: PublishItem, canPrice: boolean): UpdatePublishItemBody {
  const body: UpdatePublishItemBody = {};
  for (const key of TEXT_KEYS) {
    const text = values[key].trim();
    if (text !== item[key]) body[key] = text;
  }
  if (!canPrice) return body;
  if (values.price === 'manual') {
    const typed = values.retailPrice.trim();
    if (item.priceMode !== 'manual' || !item.retailPrice || !sameMoney(typed, item.retailPrice)) {
      body.retailPrice = toMoneyText(typed);
    }
  } else if (values.price !== item.priceMode) {
    body.pricing = values.price;
  }
  return body;
}

/** Whether a body holds no key at all. */
export function isEmptyBody(body: UpdatePublishItemBody): boolean {
  return Object.keys(body).length === 0;
}

/** The check of the typed price: a hint for the form (the server decides the floor); only the choice "Type a price" is checked. */
export function checkTypedPrice(value: string, mode: PublishPriceMode): true | string {
  return mode !== 'manual' || (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.';
}

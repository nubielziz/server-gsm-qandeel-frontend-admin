// The shop price form shared by the Storefront price dialog and the Catalog panel's price block: its values, where it starts
// from, and what a save sends. Pure reshaping; every rule (the floor, the rule, the lock) is the server's.
import type { Money } from '@/lib/api';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from '../../lib/money';
import type { RetailPriceSource, ServiceListing } from '../../types';

/** What the price form holds: how the price is set, and the typed price (text, as an input gives it). */
export type PriceFormValues = { mode: 'rule' | 'type'; retailPrice: string };

/** The server names the choice `retailPricing`; the form's radio group is `mode`. */
export const PRICE_FORM_OPTIONS = {
  fields: ['retailPrice', 'mode'],
  aliases: { retailPricing: 'mode' },
} as const;

/** The price facts of a listing the form starts from: a price a rule wrote starts on "Follow the rule", any other on "Type a price". */
export type PriceFacts = { retailPrice: Money | null; retailPriceSource: RetailPriceSource | null };

/** The values the form starts from, taken from the listing the server sent. */
export function priceDefaults(facts: PriceFacts): PriceFormValues {
  return {
    mode: facts.retailPriceSource === 'rule' ? 'rule' : 'type',
    retailPrice: facts.retailPrice ? moneyInput(facts.retailPrice) : '',
  };
}

/** Hint for the typed price: a price above zero in money text. The server decides the floor. */
export function priceProblem(values: PriceFormValues): true | string {
  if (values.mode !== 'type') return true;
  return (
    (isMoneyText(values.retailPrice) && Number(values.retailPrice) > 0) || 'Enter a price greater than zero.'
  );
}

/** What the server says about how this price is set now: by a rule (and which), waiting for approval, or typed. */
export function ruleHint(
  listing: Pick<ServiceListing, 'retailPriceSource' | 'retailPriceRule' | 'retailPriceWaiting'>,
): string {
  const parts = [
    listing.retailPriceSource === 'rule' && listing.retailPriceRule
      ? `Priced now by: ${listing.retailPriceRule.label}.`
      : 'The server prices it from the cost and keeps it up to date.',
    listing.retailPriceWaiting
      ? 'A price change waits for your approval on the Shop price rules tab of the Catalog settings.'
      : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/** The two requests a save may make, as the mutation hooks give them. */
export type PriceActions = {
  follow: (listing: ServiceListing) => Promise<unknown>;
  setPrice: (args: { listing: ServiceListing; retailPrice: Money }) => Promise<unknown>;
};

/**
 * Sends what the form says: "Follow the rule" asks the server to price by the rule and sends no price; "Type a price" sends the
 * price and no rule (the two are never in one request: the server refuses the mix). A typed price that is the one already typed
 * sends nothing. Answers whether a request was sent.
 */
export async function savePriceForm(
  values: PriceFormValues,
  listing: ServiceListing,
  actions: PriceActions,
): Promise<boolean> {
  if (values.mode === 'rule') {
    await actions.follow(listing);
    return true;
  }
  if (
    listing.retailPrice &&
    sameMoney(values.retailPrice, listing.retailPrice) &&
    listing.retailPriceSource !== 'rule'
  ) {
    return false;
  }
  await actions.setPrice({ listing, retailPrice: toMoneyText(values.retailPrice) });
  return true;
}

// The text and the request bodies of the two price forms (the price and the group prices), used by the edit view's Set Pricing part and the
// Pricing view's save. They only reshape text: no amount is added, compared or rounded here, the server owns every price.
import type { ClientGroup, Service, ServiceGroupPrice, UpdateServiceBody } from '../types';
import { RETAIL_GROUP_KIND } from './groupPrices';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from './money';

/** The three boxes of Edit price, as text: the credit, the minimum profit and "Your cost" (empty reads as 0). */
export type PriceValues = { basePrice: string; minProfit: string; ownCost: string };

/** The names of the Edit price boxes, so the server's field messages find their box. */
export const PRICE_FIELDS = ['basePrice', 'minProfit', 'ownCost'] as const;

/** The prices of a service the Edit price form starts from and compares with. */
export type PriceFigures = Pick<Service, 'basePrice' | 'minProfit' | 'ownCost'>;

/** The boxes filled with what the server has now. */
export function priceDefaults(saved: PriceFigures): PriceValues {
  return {
    basePrice: moneyInput(saved.basePrice),
    minProfit: moneyInput(saved.minProfit),
    ownCost: moneyInput(saved.ownCost),
  };
}

/**
 * Only what changed, so a price with more decimals than its box shows is never rounded by a save. An empty object means
 * nothing changed. The check that a price is above the floor is the server's: it answers a refusal that shows under the box.
 * An empty "Your cost" box means no own cost of its own: 0.
 */
export function priceChanges(values: PriceValues, saved: PriceFigures): UpdateServiceBody {
  const body: UpdateServiceBody = {};
  if (!sameMoney(values.basePrice, saved.basePrice)) body.basePrice = toMoneyText(values.basePrice);
  if (!sameMoney(values.minProfit, saved.minProfit)) body.minProfit = toMoneyText(values.minProfit);
  const ownCost = values.ownCost.trim() === '' ? '0' : values.ownCost;
  if (!sameMoney(ownCost, saved.ownCost)) body.ownCost = toMoneyText(ownCost);
  return body;
}

/** The boxes of Group prices, one text per rank, under the name {@link groupFieldOf} gives. */
export type GroupValues = Record<string, string>;

/** The box name of a rank. */
export const groupFieldOf = (group: Pick<ClientGroup, 'id'>) => `group_${group.id}`;

/**
 * The groups that get a box. The dialog lists every group. a part of the edit view leaves out the storefront's retail group, whose price has its
 * own block there: its saved row is not a box, so it goes back unchanged with the other unlisted rows.
 */
export function listedGroups(groups: readonly ClientGroup[], hideRetail: boolean): ClientGroup[] {
  return hideRetail ? groups.filter((group) => group.kind !== RETAIL_GROUP_KIND) : [...groups];
}

/** The boxes filled with the prices saved for their groups; a group with no saved price starts blank. */
export function groupDefaults(
  listed: readonly ClientGroup[],
  saved: readonly ServiceGroupPrice[],
): GroupValues {
  return Object.fromEntries(
    listed.map((group) => {
      const price = saved.find((entry) => entry.groupId === group.id)?.price;
      return [groupFieldOf(group), price ? moneyInput(price) : ''];
    }),
  );
}

/** What reading the group boxes gives: the whole list to save, or the name of the first box that holds no usable price. */
export type GroupPricesRead = { prices: ServiceGroupPrice[] } | { badField: string };

/**
 * The list a save sends. A blank box means no fixed price. The save replaces the whole list, so a saved price for a group that
 * has no box here (the retail group in the panel, or a group the menu does not list) goes back unchanged instead of being lost.
 */
export function readGroupPrices(
  values: GroupValues,
  listed: readonly ClientGroup[],
  saved: readonly ServiceGroupPrice[],
): GroupPricesRead {
  const prices: ServiceGroupPrice[] = [];
  for (const group of listed) {
    const text = (values[groupFieldOf(group)] ?? '').trim();
    if (text === '') continue;
    if (!isMoneyText(text) || Number(text) <= 0) return { badField: groupFieldOf(group) };
    prices.push({ groupId: group.id, price: toMoneyText(text) });
  }
  const boxed = new Set(listed.map((group) => group.id));
  prices.push(...saved.filter((entry) => !boxed.has(entry.groupId)));
  return { prices };
}

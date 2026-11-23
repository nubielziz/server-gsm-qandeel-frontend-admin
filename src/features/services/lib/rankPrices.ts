// The words of the "Pays now" column of the Set Pricing part: what a merchant rank pays for one service today. A rank with a saved fixed
// price pays that price; a rank without one follows the base price less its discount. Both come from the server (the saved price, and
// the rank's discount as the server sent it): nothing is added, compared or rounded here (the console computes no price).
import type { Money } from '@/lib/api';
import type { ClientGroup, ServiceGroupPrice } from '../types';
import { percentText } from './money';

/** What a rank pays now: its saved fixed price, or the words for following the base price. */
export type PaysNow = { kind: 'fixed'; price: Money } | { kind: 'follows'; words: string };

/** "Base price" for a rank with no discount, "Base price less 4%" for one with. */
export function followWords(group: Pick<ClientGroup, 'discountPercent'>): string {
  return Number(group.discountPercent) === 0
    ? 'Base price'
    : `Base price less ${percentText(group.discountPercent)}`;
}

/** What this rank pays now, from the service's saved fixed prices. */
export function paysNowOf(
  group: Pick<ClientGroup, 'id' | 'discountPercent'>,
  saved: readonly ServiceGroupPrice[],
): PaysNow {
  const fixed = saved.find((entry) => entry.groupId === group.id);
  return fixed ? { kind: 'fixed', price: fixed.price } : { kind: 'follows', words: followWords(group) };
}

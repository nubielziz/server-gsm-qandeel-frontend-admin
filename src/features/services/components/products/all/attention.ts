// Why a service needs a person, and why it cannot go on the shop, in words, for the second line of its name cell in the All view. The
// reasons and their order are the server's (`attention`, `shopBlocked`, only the ones this role may see); this only words them. A service
// delivered from code stock shows its stock here instead of "No supplier" (its own code services have no supplier by design: the server
// counts the codes in stock as supply, so `no_supplier` on such a service means its stock is empty too).
import { SHOP_BLOCK_WORDS } from '../../../lib/shopSwitch';
import type { AttentionReason, Service } from '../../../types';

/** The words of each reason, and the hint that says what to do. */
export const ATTENTION_WORDS: Record<AttentionReason, { word: string; hint: string }> = {
  no_supplier: { word: 'No supplier', hint: 'Orders cannot be sent: connect a supplier in API Connection.' },
  below_floor: { word: 'Below floor', hint: 'The merchant price is under cost plus minimum profit.' },
  price_proposal: { word: 'Price waiting', hint: 'A new shop price waits to be applied or kept.' },
  publish_failed: { word: 'Publish failed', hint: 'The last try to put it on the shop was refused.' },
};

/**
 * The server's reason the service cannot go on the shop (`shopBlocked`), in words; null when nothing blocks it, when it is already on
 * the shop, or when the role may not read the shop (the row then has no `shopBlocked`). It is the same words as the hover text of the
 * Shop square, written where the eye already is so the Shop column can stay as narrow as the Status column.
 */
export function shopBlockOf(service: Pick<Service, 'isListed' | 'shopBlocked'>): string | null {
  const blocked = service.shopBlocked ?? null;
  return blocked !== null && service.isListed !== true ? SHOP_BLOCK_WORDS[blocked] : null;
}

/** How the stock words are coloured: codes in stock are good, none left with nothing else to fill an order is critical, the rest is quiet. */
export type StockTone = 'good' | 'neutral' | 'crit';

/**
 * What the second line of a service delivered from code stock says about its codes. The server's `attention` decides: `no_supplier` on a
 * stock service means no supplier and no code is left to fill an order, so it reads "No codes in stock" in the critical tone; otherwise
 * "Codes: N in stock" (good when N is above 0, quiet at 0: a supplier or a person still fills the orders). The console works out nothing
 * itself. A service that is not delivered from code stock has no stock words (null).
 */
export function stockWordsOf(
  service: Pick<Service, 'stockDelivery' | 'stockAvailable' | 'attention'>,
): { word: string; hint: string; tone: StockTone } | null {
  if (!service.stockDelivery) return null;
  if (service.attention?.includes('no_supplier')) {
    return {
      word: 'No codes in stock',
      hint: 'Orders cannot be filled: import codes in the Inventory part.',
      tone: 'crit',
    };
  }
  const left = service.stockAvailable;
  return left > 0
    ? { word: `Codes: ${left} in stock`, hint: 'Orders take one of these codes first.', tone: 'good' }
    : {
        word: 'Codes: 0 in stock',
        hint: 'Orders go the usual way when the stock is empty.',
        tone: 'neutral',
      };
}

/** The reasons the server sent for a service, worded, in the server's order. A reason this console does not know is left out. */
export function attentionOf(
  service: Pick<Service, 'attention'>,
): { reason: AttentionReason; word: string; hint: string }[] {
  return (service.attention ?? []).flatMap((reason) => {
    const words = ATTENTION_WORDS[reason];
    return words ? [{ reason, ...words }] : [];
  });
}

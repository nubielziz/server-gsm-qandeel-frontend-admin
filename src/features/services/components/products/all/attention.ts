// Why a service needs a person, and why it cannot go on the shop, in words, for the second line of its name cell in the All view. The
// reasons and their order are the server's (`attention`, `shopBlocked`, only the ones this role may see); this only words them.
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

/** The reasons the server sent for a service, worded, in the server's order. A reason this console does not know is left out. */
export function attentionOf(
  service: Pick<Service, 'attention'>,
): { reason: AttentionReason; word: string; hint: string }[] {
  return (service.attention ?? []).flatMap((reason) => {
    const words = ATTENTION_WORDS[reason];
    return words ? [{ reason, ...words }] : [];
  });
}

// What the "Ready-made methods" gallery says about the catalog and the methods already made from it (feature 32, backend B232).
// Display helpers only: the server decides which preset can be added and checks the code.
import type { PaymentGateway } from '../types';

/** How many methods were made from this preset. */
export function addedCount(key: string, gateways: readonly Pick<PaymentGateway, 'preset'>[]): number {
  return gateways.filter((gateway) => gateway.preset === key).length;
}

// What the "Ready-made methods" gallery says about the catalog and the methods already made from it (feature 32, backend B232).
// Display helpers only: the server decides which preset can be added and checks the code.
import type { PaymentGateway } from '../types';

/**
 * A code no method uses yet, made from the preset's key: `vodafone_cash`, then `vodafone_cash_2`, `vodafone_cash_3`, and so on.
 * The code is part of the payment webhook address and cannot change later; staff may still edit it before they save.
 * Several methods may come from one preset (two bank accounts), so the first free number is taken.
 */
export function freeCode(key: string, gateways: readonly Pick<PaymentGateway, 'code'>[]): string {
  const taken = new Set(gateways.map((gateway) => gateway.code));
  let code = key;
  for (let number = 2; taken.has(code); number += 1) code = `${key}_${number}`;
  return code;
}

/** How many methods were made from this preset. */
export function addedCount(key: string, gateways: readonly Pick<PaymentGateway, 'preset'>[]): number {
  return gateways.filter((gateway) => gateway.preset === key).length;
}

// The words the Risk page uses for blocklist kinds, sources and payment methods. Ports the `BLOCK_KIND` and `BLOCK_SRC` tables of
// 54-p-risk.js and `B2C_METHODS`.
import type { AddableBlockKind, BlockKind, BlockSource, PaymentMethod } from '../types';

/**
 * The server may send a value this table does not know (a new kind, a new source). Show it as it comes instead of a
 * blank or "undefined".
 */
export function labelOf<K extends string>(table: Readonly<Record<K, string>>, value: string): string {
  return Object.hasOwn(table, value) ? table[value as K] : value;
}

export const BLOCK_KIND_LABEL: Readonly<Record<BlockKind, string>> = {
  email: 'Email',
  domain: 'Email domain',
  imei: 'IMEI',
  card: 'Card',
  device: 'Device',
  country: 'Country',
};

/** The kinds in the type filter of the blocklist, in the demo's order. */
export const BLOCK_KINDS = Object.keys(BLOCK_KIND_LABEL) as BlockKind[];

/** The kinds the Add dialog offers: everything but the ones only the system adds. */
export const ADDABLE_KINDS: readonly AddableBlockKind[] = ['email', 'domain', 'imei', 'card'];

export const BLOCK_SOURCE_LABEL: Readonly<Record<BlockSource, string>> = {
  manual: 'Added by hand',
  auto: 'Automatic',
  chargeback: 'After a chargeback',
};

export const PAYMENT_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: 'Card (3DS)',
  wallet: 'Apple / Google Pay',
  crypto: 'Crypto (USDT / BTC)',
  balance: 'Store balance',
};

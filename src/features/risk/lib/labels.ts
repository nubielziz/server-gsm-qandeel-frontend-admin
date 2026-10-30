// The words and badge tones the Risk page uses for kinds, results, sources, payment methods and risk levels. Ports the
// `CHECK_KIND`, `CHECK_RESULT`, `CHECK_SRC`, `BLOCK_KIND`, `BLOCK_SRC` tables of 54-p-risk.js, `B2C_METHODS` and `RISK_LABEL`.
import type { BadgeTone, IconName } from '@/components/ui';
import type {
  AddableBlockKind,
  BlockKind,
  BlockSource,
  CheckKind,
  CheckResult,
  CheckSource,
  CustomerRisk,
  PaymentMethod,
} from '../types';

/**
 * The server may send a value this table does not know (a new kind, a new source). Show it as it comes instead of a
 * blank or "undefined".
 */
export function labelOf<K extends string>(table: Readonly<Record<K, string>>, value: string): string {
  return Object.hasOwn(table, value) ? table[value as K] : value;
}

export const CHECK_KIND_LABEL: Readonly<Record<CheckKind, string>> = {
  blacklist: 'Blacklist',
  basic: 'Device info',
  icloud: 'iCloud status',
  sim_lock: 'SIM lock',
};

export const CHECK_KINDS = Object.keys(CHECK_KIND_LABEL) as CheckKind[];

export const CHECK_SOURCE_LABEL: Readonly<Record<CheckSource, string>> = {
  pre_order: 'Before an order',
  storefront_free: 'Free checker',
};

type Badged = { tone: BadgeTone; icon: IconName; label: string };

/** The badge of each result: a word, a tone and an icon (a status is never colour alone). */
export const CHECK_RESULT: Readonly<Record<CheckResult, Badged>> = {
  clean: { tone: 'good', icon: 'checkCircle', label: 'Clean' },
  blacklisted: { tone: 'crit', icon: 'xCircle', label: 'Blacklisted' },
  locked: { tone: 'warn', icon: 'lock', label: 'Locked' },
  unknown: { tone: 'neutral', icon: 'info', label: 'Unknown' },
};

export const CHECK_RESULTS = Object.keys(CHECK_RESULT) as CheckResult[];

/** The badge for a result; one the table does not know is shown neutral with the server's word. */
export function resultBadge(status: string): Badged {
  return Object.hasOwn(CHECK_RESULT, status)
    ? CHECK_RESULT[status as CheckResult]
    : { tone: 'neutral', icon: 'info', label: status };
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
};

/** The badge of a customer's risk level, shown as "Medium risk". */
export const RISK_LEVEL: Readonly<Record<CustomerRisk, { tone: BadgeTone; label: string }>> = {
  low: { tone: 'neutral', label: 'Low' },
  medium: { tone: 'warn', label: 'Medium' },
  high: { tone: 'crit', label: 'High' },
};

export function riskLevel(level: string): { tone: BadgeTone; label: string } {
  return Object.hasOwn(RISK_LEVEL, level)
    ? RISK_LEVEL[level as CustomerRisk]
    : { tone: 'neutral', label: level };
}

// The Customer wallet settings of the System tab (feature 21): two switches and six whole numbers, with the ranges and defaults the
// server uses (`wallet.customer.*`). The ranges are hints; the server decides and its message shows under the field. A key that was
// never set is absent from `GET /admin/settings`, so the server's default applies (the switches are off).
import type { BooleanSetting, SettingSpec } from './system';
import type { Settings } from '../types';

/** The keys, in the order the panel shows them. */
export const WALLET_KEYS = {
  enabled: 'wallet.customer.enabled',
  cardTopUps: 'wallet.customer.card_topups',
  minTopUp: 'wallet.customer.min_topup',
  maxTopUp: 'wallet.customer.max_topup',
  maxBalance: 'wallet.customer.max_balance',
  topUpsPerDay: 'wallet.customer.topups_per_day',
  topUpAmountPerDay: 'wallet.customer.topup_amount_per_day',
  adjustApprovalLimit: 'wallet.customer.adjust_approval_limit',
} as const;

/** The eight specs. */
export const WALLET_SETTINGS: readonly SettingSpec[] = [
  {
    key: WALLET_KEYS.enabled,
    label: 'Store balance',
    type: 'boolean',
    hint: 'Customers can top up and pay from their store balance. Off hides Add funds and Pay from balance on the store; a balance still shows.',
  },
  {
    key: WALLET_KEYS.cardTopUps,
    label: 'Card top-ups',
    type: 'boolean',
    hint: 'Customers can top up with an automatic method such as a card. Bank transfers are checked by your team.',
  },
  {
    key: WALLET_KEYS.minTopUp,
    label: 'Smallest top-up',
    type: 'integer',
    unit: 'USD',
    hint: 'Whole dollars. Smaller top-ups are refused.',
    min: 1,
    max: 10_000,
    fallback: 5,
  },
  {
    key: WALLET_KEYS.maxTopUp,
    label: 'Largest top-up',
    type: 'integer',
    unit: 'USD',
    hint: 'Whole dollars, one top-up. It must not be below the smallest.',
    min: 1,
    max: 100_000,
    fallback: 500,
  },
  {
    key: WALLET_KEYS.maxBalance,
    label: 'Highest balance',
    type: 'integer',
    unit: 'USD',
    hint: 'Top-ups that would take the balance (with unpaid top-ups) above this are refused.',
    min: 1,
    max: 1_000_000,
    fallback: 1000,
  },
  {
    key: WALLET_KEYS.topUpsPerDay,
    label: 'Top-ups per day',
    type: 'integer',
    unit: 'in 24 hours',
    hint: 'How many top-ups one customer may start in the trailing 24 hours.',
    min: 1,
    max: 100,
    fallback: 5,
  },
  {
    key: WALLET_KEYS.topUpAmountPerDay,
    label: 'Top-up amount per day',
    type: 'integer',
    unit: 'USD in 24 hours',
    hint: 'How much one customer may top up in the trailing 24 hours.',
    min: 1,
    max: 1_000_000,
    fallback: 1000,
  },
  {
    key: WALLET_KEYS.adjustApprovalLimit,
    label: 'Adjust approval limit',
    type: 'integer',
    unit: 'USD',
    hint: 'A staff adjustment above this needs a second approver. 0 means every adjustment does.',
    min: 0,
    max: 10_000,
    fallback: 500,
  },
];

/** The setting's value as the switch shows it: only an explicit `true` is on. */
export function switchOn(settings: Settings | undefined, spec: BooleanSetting): boolean {
  return settings?.[spec.key] === true;
}

/**
 * A note when the saved limits contradict each other: the server then ignores both top-up limits and uses its defaults
 * (5 and 500), which the staff member would not guess. Null when they agree, or either is unset.
 */
export function limitsWarning(settings: Settings | undefined): string | null {
  const min = settings?.[WALLET_KEYS.minTopUp];
  const max = settings?.[WALLET_KEYS.maxTopUp];
  if (typeof min !== 'number' || typeof max !== 'number' || min <= max) return null;
  return 'The smallest top-up is above the largest, so the server ignores both and uses its defaults ($5 and $500).';
}

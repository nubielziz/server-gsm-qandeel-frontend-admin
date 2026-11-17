// The catalog of ready-made payment methods the mock sends (`GET /admin/payment-gateway-presets`), equal to plan section 3 of feature 32
// (backend B232): the same keys, names, kinds, drivers and top-up words in the same order, and which entries can be added yet. The mock
// also plays the server's refusals of a create body that carries `preset` and of an edit that would move a preset-made method away from its entry. Mocks fake answers only (decision 014).
import type { ProblemError } from '@/mocks/problem';
import type { GatewayPreset } from '../types';

const BLANK = '________';

/** The catalog, in the order the gallery shows it. The two automatic entries are listed but not built yet. */
export const PRESET_CATALOG: readonly GatewayPreset[] = [
  {
    key: 'bank_transfer',
    name: 'Bank transfer',
    kind: 'manual',
    available: true,
    driver: 'bank_transfer',
    methodType: 'bank',
    instructions: `Bank: ${BLANK}, account name: ${BLANK}, IBAN: ${BLANK}. Write your top-up number as the reference and upload the receipt.`,
  },
  {
    key: 'crypto_transfer',
    name: 'Crypto transfer',
    kind: 'manual',
    available: true,
    driver: 'crypto_transfer',
    methodType: 'usdt',
    instructions: `Send USDT on the ${BLANK} network to the address ${BLANK} and upload a screenshot with the transaction hash.`,
  },
  {
    key: 'vodafone_cash',
    name: 'Vodafone Cash',
    kind: 'manual',
    available: true,
    driver: 'vodafone_cash',
    methodType: 'bank',
    instructions: `Send the amount to the Vodafone Cash number ${BLANK} and upload a screenshot of the transfer. Write your top-up number in the note.`,
  },
  {
    key: 'fawry_transfer',
    name: 'Fawry',
    kind: 'manual',
    available: true,
    driver: 'fawry_transfer',
    methodType: 'bank',
    instructions: `Pay the amount through Fawry to the account ${BLANK} and upload a photo or screenshot of the receipt. Write your top-up number in the note.`,
  },
  {
    key: 'instapay',
    name: 'InstaPay',
    kind: 'manual',
    available: true,
    driver: 'instapay',
    methodType: 'bank',
    instructions: `Send the amount by InstaPay to the address ${BLANK} and upload a screenshot of the transfer. Write your top-up number in the note.`,
  },
  {
    key: 'binance_pay',
    name: 'Binance Pay',
    kind: 'manual',
    available: true,
    driver: 'binance_pay',
    methodType: 'usdt',
    instructions: `Send the amount by Binance Pay to the Pay ID ${BLANK} and upload a screenshot of the transfer. Write your top-up number in the note.`,
  },
  {
    key: 'nowpayments',
    name: 'NOWPayments',
    kind: 'automatic',
    available: false,
    driver: 'nowpayments',
    methodType: 'usdt',
    instructions: '',
  },
  {
    key: 'binance_pay_auto',
    name: 'Binance Pay (automatic)',
    kind: 'automatic',
    available: false,
    driver: 'binance_pay_auto',
    methodType: 'usdt',
    instructions: '',
  },
];

/** The refusals on `isManual` and `driver` of a method that must stay what its preset says (the backend's `kindAndDriverProblems`). */
function kindAndDriverProblems(
  preset: GatewayPreset,
  isManual: boolean,
  driver: string | undefined,
): ProblemError[] {
  const problems: ProblemError[] = [];
  if (isManual !== (preset.kind === 'manual'))
    problems.push({
      field: 'isManual',
      message: `${preset.name} is ${preset.kind === 'manual' ? 'a manual' : 'an automatic'} method.`,
    });
  if (driver !== preset.driver)
    problems.push({ field: 'driver', message: `The driver of ${preset.name} is "${preset.driver}".` });
  return problems;
}

/**
 * What the server refuses in a create body that carries `preset` (422, on the field named), with the backend's words: an unknown key (the
 * only problem then), an entry that cannot be added yet, and, for every entry, an `isManual` or a `driver` that is not the entry's (all of
 * them are reported together). No `preset` (or `null`) is a custom method: no problems.
 */
export function presetProblems(body: Record<string, unknown>): ProblemError[] {
  if (body.preset === undefined || body.preset === null) return [];
  const preset = PRESET_CATALOG.find((entry) => entry.key === body.preset);
  if (!preset)
    return [
      {
        field: 'preset',
        message: `The ready-made method "${String(body.preset)}" does not exist. Choose one of: ${PRESET_CATALOG.map((entry) => entry.key).join(', ')}.`,
      },
    ];
  const problems: ProblemError[] = [];
  if (!preset.available)
    problems.push({
      field: 'preset',
      message: `${preset.name} cannot be added yet: its connection is not built.`,
    });
  const driver = typeof body.driver === 'string' ? body.driver.trim() : undefined;
  problems.push(...kindAndDriverProblems(preset, body.isManual === true, driver));
  return problems;
}

/**
 * What the server refuses in an edit of a method made from a preset: the merged row must keep the entry's kind and driver (422 on `isManual`
 * and `driver`). A custom method, and a stored key the catalog does not know, are never pinned. Create's `unknown` and `unavailable` checks do not apply.
 */
export function presetPinProblems(
  presetKey: string | null | undefined,
  merged: { isManual: boolean; driver: string },
): ProblemError[] {
  const preset = PRESET_CATALOG.find((entry) => entry.key === presetKey);
  return preset ? kindAndDriverProblems(preset, merged.isManual, merged.driver) : [];
}

// The values of the rank form and how they become the body of a create or an update: the percent and the deposit limit are read from what
// was typed (text parsing, no float maths) and an edit sends only the fields that changed. Ports the group dialog's body logic and the percent
// parser of the old merchants feature, for `CRUD /admin/client-groups`.
import type { Decimal, Money } from '@/lib/api';
import { isRetailRank } from '../../lib/ranks';
import type { CreateRankBody, Rank, UpdateRankBody } from '../../types';

/** The longest rank name the form takes. */
export const RANK_NAME_MAX = 60;

/** What the form holds. The two figures are text, as typed; `parsePercent` and `parseDeposit` read them. */
export type RankValues = {
  name: string;
  discountPercent: string;
  depositLimit: string;
  overdraftAllowed: boolean;
  isDefault: boolean;
};

/** The form's field names, so a server message about any other field shows beside the button instead. */
export const RANK_FIELDS = [
  'name',
  'discountPercent',
  'depositLimit',
  'overdraftAllowed',
  'isDefault',
] as const;

/** What +Add Rank starts with: no name, no discount, no deposit limit, no credit, not the default. */
export const NEW_RANK: RankValues = {
  name: '',
  discountPercent: '0',
  depositLimit: '0.00',
  overdraftAllowed: false,
  isDefault: false,
};

/** A name as it is sent: without the spaces around it. */
export function cleanName(text: string): string {
  return text.trim();
}

const PERCENT = /^(\d{1,3})(?:\.(\d{1,2}))?$/;

/**
 * A percent between 0 and 100 with up to two decimals ("4", "2.5%"), as the API's decimal text ("2.5"), or null when it is not one.
 * Zero is a discount (no discount).
 */
export function parsePercent(text: string): Decimal | null {
  const match = PERCENT.exec(text.trim().replace(/\s*%$/, ''));
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? '').replace(/0+$/, '');
  if (whole > 100 || (whole === 100 && fraction !== '')) return null;
  return fraction ? `${whole}.${fraction}` : String(whole);
}

// "1250", "1,250", "1250.5" or "$1,250.0000": a whole part (digits, or digits grouped by thousands commas) and up to four decimals.
const AMOUNT = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,4}))?$/;

/**
 * The API's money text ("20000" becomes "20000.0000") for a deposit limit that was typed, or null when it is not an amount. A dollar sign
 * and thousands commas are allowed; zero is allowed (nothing may be added at once); a comma used as a decimal mark ("25,50") is refused
 * instead of being read as 2550.
 */
export function parseDeposit(text: string): Money | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$\s*/, ''));
  if (!match) return null;
  const whole = match[1].replaceAll(',', '').replace(/^0+(?=\d)/, '');
  return `${whole}.${(match[2] ?? '').padEnd(4, '0')}`;
}

/** A decimal text without leading or trailing zeros ("04.5000" is "4.5", "20000.0000" is "20000"); anything else comes back as it is. */
export function plainDecimal(value: string): string {
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value.trim());
  if (!match) return value.trim();
  const whole = match[1].replace(/^0+(?=\d)/, '');
  const fraction = (match[2] ?? '').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

/** A percent as a person types it back into the box: "4.0000" is "4", "9.5000" is "9.5". */
export function percentInput(value: Decimal): string {
  return plainDecimal(value);
}

/** Money as a person types it back into the box: "20000.0000" is "20000.00", "0.1250" is "0.125". */
export function depositInput(value: Money): string {
  const plain = plainDecimal(value);
  if (!/^\d+(?:\.\d+)?$/.test(plain)) return plain;
  const [whole, fraction = ''] = plain.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

/** The form's values for a rank that exists. */
export function rankValues(rank: Rank): RankValues {
  return {
    name: rank.name,
    discountPercent: percentInput(rank.discountPercent),
    depositLimit: depositInput(rank.depositLimit),
    overdraftAllowed: rank.overdraftAllowed,
    isDefault: rank.isDefault,
  };
}

/**
 * The body of `POST /admin/client-groups`. The form checked the two figures before this runs, so they parse; the fallbacks only satisfy the
 * types. A field the server may still send for a retired upgrade threshold is never part of it.
 */
export function createBody(values: RankValues): CreateRankBody {
  return {
    name: cleanName(values.name),
    discountPercent: parsePercent(values.discountPercent) ?? '0',
    depositLimit: parseDeposit(values.depositLimit) ?? '0.0000',
    overdraftAllowed: values.overdraftAllowed,
    isDefault: values.isDefault,
  };
}

/**
 * The body of `PATCH /admin/client-groups/:id`: only the fields that differ from `rank` ("4" and "4.0000" are the same number). The retail
 * rank has no discount, no credit and no default mark to change, so those are never sent for it. An empty body means nothing changed.
 */
export function changesOf(values: RankValues, rank: Rank): UpdateRankBody {
  const next = createBody(values);
  const body: UpdateRankBody = {};
  if (next.name !== rank.name) body.name = next.name;
  if (plainDecimal(next.depositLimit) !== plainDecimal(rank.depositLimit))
    body.depositLimit = next.depositLimit;
  if (isRetailRank(rank)) return body;
  if (plainDecimal(next.discountPercent) !== plainDecimal(rank.discountPercent)) {
    body.discountPercent = next.discountPercent;
  }
  if (next.overdraftAllowed !== rank.overdraftAllowed) body.overdraftAllowed = next.overdraftAllowed;
  if (next.isDefault !== rank.isDefault) body.isDefault = next.isDefault;
  return body;
}

/** The rule of the Rank name field: a message, or true when the name will do. */
export function nameProblem(text: string): string | true {
  const name = cleanName(text);
  if (name === '') return 'Enter a rank name.';
  return name.length > RANK_NAME_MAX ? `Use ${RANK_NAME_MAX} characters or fewer.` : true;
}

/** The rule of the Discount field. */
export function percentProblem(text: string): string | true {
  return parsePercent(text) !== null || 'Enter a percent from 0 to 100, with up to two decimals.';
}

/** The rule of the Deposit limit field (zero is allowed). */
export function depositProblem(text: string): string | true {
  return parseDeposit(text) !== null || 'Enter an amount like 20000.00.';
}

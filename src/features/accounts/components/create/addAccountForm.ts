// The form logic of +Add Account: what is typed, tidied and checked before the server is asked, the choices of the Rank menu, and the body of
// `POST /admin/clients` for each kind of rank. The checks are hints only: the server validates everything and its field messages show
// under the same fields (decision 008). No float maths: an amount stays text.
import type { SelectOption } from '@/components/ui';
import type { Money } from '@/lib/api';
import { isOnlyDialCode } from '@/lib/phone/dial';
import { rankLabel, rankKindOf } from '../../lib/ranks';
import type { CreateAccountBody, PasswordMode, Rank, RankKind } from '../../types';

/** What the form holds. `rank` is `'retail'` or the id of a merchant rank, as text (a select's value). */
export type AddAccountValues = {
  name: string;
  email: string;
  rank: string;
  country: string;
  phone: string;
  company: string;
  creditLimit: string;
  mode: PasswordMode;
};

/** The names of the form's fields, so a message about any other field still shows above the bar. */
export const ADD_ACCOUNT_FIELDS = [
  'name',
  'email',
  'rank',
  'country',
  'phone',
  'company',
  'creditLimit',
  'mode',
] as const;

/** API field names that differ from the form's. */
export const ADD_ACCOUNT_ALIASES = { groupId: 'rank', 'password.mode': 'mode' } as const;

/** What the form says under Email when a guest bought with it (the server's code `guest`): the link to that guest follows. */
export const GUEST_EMAIL_WORDS = 'A guest bought with this email. Make that guest an account instead.';

/** The value of the Rank menu's first choice: the shop's retail rank (the body then carries no `groupId`). */
export const RETAIL_CHOICE = 'retail';

/**
 * An empty form for a retail account that gets a link to choose its password. No country is chosen for the person (decision 041): it sets
 * their currency and VAT, so staff pick it.
 */
export function addAccountDefaults(): AddAccountValues {
  return {
    name: '',
    email: '',
    rank: RETAIL_CHOICE,
    country: '',
    phone: '',
    company: '',
    creditLimit: '',
    mode: 'reset_link',
  };
}

/** A name with the spaces tidied: trimmed, and every run of spaces made one. */
export function cleanName(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** A name needs two characters; shorter is "Enter a name.". */
export function validName(text: string): boolean {
  return cleanName(text).length >= 2;
}

/** An email as sent: trimmed and lower case, so "Ops@Shop.example " and "ops@shop.example" are one address. */
export function cleanEmail(text: string): string {
  return text.trim().toLowerCase();
}

/** A rough shape check (something, an @, something, a dot, something); the server decides what is a real address. */
export function validEmail(text: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.trim());
}

/** A country code as sent: two letters, upper case ("jo" is "JO"). */
export function cleanCountry(text: string): string {
  return text.trim().toUpperCase();
}

/** Two letters: a merchant's country is picked from every ISO country, a retail account's from the shop's list (both menus hold the code). */
export function validCountry(text: string): boolean {
  return /^[A-Za-z]{2}$/.test(text.trim());
}

// "500", "1,250" or "$1250.5": a whole part (digits, or digits grouped by thousands commas) and up to four decimals.
const AMOUNT = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,4}))?$/;

/**
 * The API's money text ("500" becomes "500.0000") for a credit limit that was typed, or null when it is not an amount. A dollar sign and
 * thousands commas are allowed; zero is an amount (no credit); a comma used as the decimal mark ("25,50") is refused instead of being
 * read as 2550. An empty box is not an amount either: the caller leaves the key out.
 */
export function parseCreditLimit(text: string): Money | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$\s*/, ''));
  if (!match) return null;
  const whole = (match[1] ?? '').replaceAll(',', '').replace(/^0+(?=\d)/, '');
  return `${whole}.${(match[2] ?? '').padEnd(4, '0')}`;
}

/** The kind of rank a choice of the Rank menu stands for. */
export function choiceKind(choice: string): RankKind {
  return choice === RETAIL_CHOICE ? 'retail' : 'merchant';
}

/** The merchant rank a choice names, or undefined for the retail choice or an id the list does not have. */
export function chosenRank(ranks: readonly Rank[], choice: string): Rank | undefined {
  if (choice === RETAIL_CHOICE) return undefined;
  return ranks.find((rank) => String(rank.id) === choice && rankKindOf(rank) === 'merchant');
}

/** Whether an account of this rank may be given a credit limit when it is added: a merchant rank that allows credit. */
export function allowsCredit(rank: Rank | undefined): boolean {
  return rank !== undefined && rankKindOf(rank) === 'merchant' && rank.overdraftAllowed;
}

/**
 * The choices of the Rank menu: "Retail (shop)" first, then the merchant ranks in the server's order, the default one marked. A role
 * that is not the Owner sees them as disabled choices ("VIP: Owner only"). Without the list of ranks (no `groups:read`, still loading,
 * failed) only the retail choice is there.
 */
export function rankChoices(ranks: readonly Rank[] | undefined, isOwner: boolean): SelectOption[] {
  const merchants = (ranks ?? []).filter((rank) => rankKindOf(rank) === 'merchant');
  return [
    { value: RETAIL_CHOICE, label: 'Retail (shop)' },
    ...merchants.map((rank) =>
      isOwner
        ? {
            value: String(rank.id),
            label: `${rankLabel(rank)}${rank.isDefault ? ' · new merchants start here' : ''}`,
          }
        : { value: String(rank.id), label: `${rank.name}: Owner only`, disabled: true },
    ),
  ];
}

/**
 * The body of `POST /admin/clients`. A retail account is added with no `groupId`, no company and no credit limit; a merchant rank sends
 * its `groupId`, the company when typed and the credit limit when the rank allows credit and `creditAllowed` says the staff member may
 * set one. Optional keys that are empty are left out. The country is the picked two-letter code, in upper case.
 *
 * @param values what the form holds.
 * @param rank the merchant rank the Rank menu names (undefined for the retail choice).
 * @param creditAllowed whether the staff member may set a credit limit (`wallet:credit_limit`).
 */
export function addAccountBody(
  values: AddAccountValues,
  rank: Rank | undefined,
  creditAllowed: boolean,
): CreateAccountBody {
  // A box that holds only a calling code (the phone box's list wrote it and no number followed) holds no phone.
  const phone = isOnlyDialCode(values.phone) ? '' : values.phone.trim();
  const body: CreateAccountBody = {
    name: cleanName(values.name),
    email: cleanEmail(values.email),
    country: cleanCountry(values.country),
    ...(phone ? { phone } : {}),
    password: { mode: values.mode },
  };
  if (!rank) return body;
  const company = values.company.trim();
  // A limit of zero is no credit: it is left out like an empty box.
  const typed = creditAllowed && allowsCredit(rank) ? parseCreditLimit(values.creditLimit) : null;
  const credit = typed !== null && /[1-9]/.test(typed) ? typed : null;
  return {
    ...body,
    groupId: rank.id,
    ...(company ? { company } : {}),
    ...(credit ? { creditLimit: credit } : {}),
  };
}

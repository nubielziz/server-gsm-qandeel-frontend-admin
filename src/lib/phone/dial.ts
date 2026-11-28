// Calling codes and phone numbers, as far as a form needs them: which country a typed number belongs to (the flag in the phone box), what
// to write when a person picks a country (its calling code before the number) and whether a box holds nothing but a calling code. The same
// rules as the shop's website (its `lib/phone/dial.ts`). Nothing here judges a number: the server does. Digits typed on an Arabic keyboard
// are read like any other. Pure: no React, no DOM.
import { ISO_COUNTRY_CODES } from '@/lib/isoCountries';
import { CALLING_CODES, SHARED_CODES, TRUNK_ZERO } from './dialData';

const CODES = new Set(Object.values(CALLING_CODES));
const TRUNK_ZERO_COUNTRIES = new Set(TRUNK_ZERO.split(' '));

/** Calling code → its one country, or the main country of a shared code (`1` → `US`). */
const MAIN_COUNTRY: Record<string, string> = {};
for (const [country, code] of Object.entries(CALLING_CODES)) MAIN_COUNTRY[code] ??= country;
for (const [code, rows] of Object.entries(SHARED_CODES)) MAIN_COUNTRY[code] = rows[0][0];

/**
 * The shared codes whose other countries are all told apart by an area code (the North American plan): once three digits follow the code
 * and none of them match, the number is the main country's, whatever the hint says.
 */
const AREA_CODED = new Set(['1']);

/** Arabic-Indic and Persian digits as 0-9 (an Arabic keyboard types them). */
function latinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => String((digit.charCodeAt(0) & 0xf) % 10));
}

const patterns = new Map<string, RegExp>();
function leadMatches(lead: string, national: string): boolean {
  if (lead === '') return false;
  let pattern = patterns.get(lead);
  if (!pattern) patterns.set(lead, (pattern = new RegExp(`^(?:${lead})`)));
  return pattern.test(national);
}

/**
 * The area code a country always has under a shared calling code (`BS` → `242`), when it is one fixed run of two or more digits. A single
 * digit (Kazakhstan's 7 under +7) is the start of a number, not an area code.
 */
function fixedArea(country: string): string {
  const lead = SHARED_CODES[CALLING_CODES[country] ?? '']?.find(([code]) => code === country)?.[1] ?? '';
  return /^\d{2,}$/.test(lead) ? lead : '';
}

/**
 * The digits of a number written the international way, without the + or the 00 in front; null for a number that is not written that way
 * (a local number, or nothing). Spaces, dashes, dots and brackets are ignored.
 */
export function internationalDigits(value: string): string | null {
  const text = latinDigits(value).replace(/[^\d+]/g, '');
  if (text.startsWith('+')) return text.replace(/\+/g, '');
  if (text.startsWith('00')) return text.slice(2);
  return null;
}

/** Splits the digits into a calling code and the rest; null while no calling code can be read (codes never start one another). */
function splitCode(digits: string): [code: string, national: string] | null {
  for (let length = 1; length <= 3; length++) {
    const code = digits.slice(0, length);
    if (CODES.has(code)) return [code, digits.slice(length)];
  }
  return null;
}

/**
 * The country of a typed phone number, from its calling code (`+962 79…` → `JO`); null for a local number, an empty box or a code no
 * country has. Where countries share a code, the start of the number decides (`+1 242…` is the Bahamas); when it cannot, `hint` does if
 * that country uses the code (the account's country, or the one picked in the box's own list), else the main country of the code.
 *
 * @param hint an ISO code that breaks a tie
 */
export function phoneCountry(value: string, hint?: string | null): string | null {
  const digits = internationalDigits(value);
  if (!digits) return null;
  const split = splitCode(digits);
  if (!split) return null;
  const [code, national] = split;
  const rows = SHARED_CODES[code];
  if (!rows) return MAIN_COUNTRY[code] ?? null;
  const hinted = hint && CALLING_CODES[hint.toUpperCase()] === code ? hint.toUpperCase() : null;
  const matches = rows.filter(([, lead]) => leadMatches(lead, national)).map(([country]) => country);
  if (matches.length > 0) return hinted && matches.includes(hinted) ? hinted : matches[0];
  if (AREA_CODED.has(code) && national.length >= 3) return rows[0][0];
  return hinted ?? rows[0][0];
}

/** What a country's row shows after its name: `+962`, or `+1 242` for a country with its own area code; null without a code. */
export function dialLabel(country: string): string | null {
  const code = CALLING_CODES[country.toUpperCase()];
  if (!code) return null;
  const area = fixedArea(country.toUpperCase());
  return area ? `+${code} ${area}` : `+${code}`;
}

/**
 * True when the box holds no number yet: nothing, a lone + or 00, or just a calling code (with the area code of a country that has one). A
 * form reads such a value as an empty phone.
 */
export function isOnlyDialCode(value: string): boolean {
  if (value.trim() === '') return true;
  const digits = internationalDigits(value);
  if (digits === null) return false;
  if (digits === '') return true;
  const split = splitCode(digits);
  if (!split) return false;
  const [code, national] = split;
  if (national === '') return true;
  return (SHARED_CODES[code] ?? []).some(([country]) => fixedArea(country) === national);
}

/**
 * The number with the calling code of `country` in front: the old calling code is replaced, a local number gets the code (and loses its
 * leading 0 where the country's own numbers are dialled with one), an empty box gets the code alone. The result is `+code`, a space, then
 * the digits; the space after a lone code keeps the two apart while the person types. A country without a calling code changes nothing.
 */
export function withCountry(value: string, country: string): string {
  const target = country.toUpperCase();
  const code = CALLING_CODES[target];
  if (!code) return value;
  let national: string;
  const digits = internationalDigits(value);
  if (digits !== null) {
    const split = splitCode(digits);
    // Digits that hold no calling code yet (`+9`) are a code being typed, not a number: the chosen code replaces them.
    national = split ? split[1] : digits.length <= 3 ? '' : digits;
    const before = split ? fixedArea(phoneCountry(value) ?? '') : '';
    if (before && national.startsWith(before)) national = national.slice(before.length);
  } else {
    national = latinDigits(value).replace(/\D/g, '');
    if (national.startsWith('0') && TRUNK_ZERO_COUNTRIES.has(target)) national = national.slice(1);
  }
  const area = fixedArea(target);
  if (area && national.startsWith(area)) national = national.slice(area.length);
  return `+${code}${area ? ` ${area}` : ''} ${national}`;
}

/**
 * What the box holds after a change: the new text, unless a whole number (one that starts with + or 00) was pasted or typed after a lone
 * calling code that the list had written. Then the number replaces that code, so `+962 ` and a pasted `+962 79 123 4567` do not end up as
 * two codes in a row.
 */
export function typedPhone(before: string, next: string): string {
  if (before.trim() === '' || !isOnlyDialCode(before) || !next.startsWith(before)) return next;
  const rest = next.slice(before.length).trimStart();
  return internationalDigits(rest) !== null ? rest : next;
}

/** A row of a country list: the code, the name and what is shown after the name (a calling code). */
export type CountryRow = { code: string; name: string; detail?: string };

let dialList: CountryRow[] | undefined;

/** Every country that has a calling code, sorted by its English name, each with the code its row shows. Built once, on first use. */
export function dialCountryRows(): readonly CountryRow[] {
  if (!dialList) {
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });
    dialList = ISO_COUNTRY_CODES.flatMap((code) => {
      const detail = dialLabel(code);
      return detail ? [{ code, name: names.of(code) ?? code, detail }] : [];
    }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }
  return dialList;
}

/** Text folded for a search: lower case, accents dropped (`Åland` is found by `aland`). */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * The rows of a country list that answer a search, best first: by calling code when the search is digits (`962`, `+1 2`), else by name
 * (names that start with the words first, then names that hold them) or by the two-letter code. An empty search keeps every row. Among
 * calling codes the rows whose code is exactly the search come first, the main country of that code at the top (`+44` puts the United
 * Kingdom before Guernsey's `+44 1481`), so Enter chooses what was meant.
 */
export function searchCountries<T extends CountryRow>(rows: readonly T[], query: string): readonly T[] {
  const wanted = fold(latinDigits(query).trim());
  if (wanted === '') return rows;
  if (/^[+\d][\d\s]*$/.test(wanted)) {
    const digits = wanted.replace(/\D/g, '');
    const codeOf = (row: T) => row.detail?.replace(/\D/g, '');
    const main = MAIN_COUNTRY[digits];
    const exact = rows.filter((row) => codeOf(row) === digits);
    const longer = rows.filter((row) => codeOf(row)?.startsWith(digits) && codeOf(row) !== digits);
    return [
      ...exact.filter((row) => row.code === main),
      ...exact.filter((row) => row.code !== main),
      ...longer,
    ];
  }
  const starts: T[] = [];
  const holds: T[] = [];
  for (const row of rows) {
    const name = fold(row.name);
    if (name.startsWith(wanted) || row.code.toLowerCase() === wanted) starts.push(row);
    else if (name.includes(wanted)) holds.push(row);
  }
  return [...starts, ...holds];
}

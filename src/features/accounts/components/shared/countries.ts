// The storefront countries, for the retail country menus and the list filter (ported from the old customers feature; the demo's B2C_COUNTRIES in
// 09-b2c-data.js), and the full ISO 3166-1 list for the country menu of a merchant rank (decision 035). The server decides which countries it
// accepts and which currency an account pays in; these lists only name them.
import type { SelectOption } from '@/components/ui';
import { ISO_COUNTRY_CODES } from '@/lib/isoCountries';

export type Country = { code: string; name: string };

/** The countries the shop sells to, in its order. */
export const COUNTRIES: readonly Country[] = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IE', name: 'Ireland' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'SE', name: 'Sweden' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
];

/** The country's name, or its code when the list does not know it. */
export function countryName(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

/**
 * The options of a country menu. A country the list does not know but the account has stays selectable (first, by its code), so an
 * edit never silently moves an account to another country.
 */
export function countryOptions(current = ''): SelectOption[] {
  const options = COUNTRIES.map((country) => ({ value: country.code, label: country.name }));
  const known = COUNTRIES.some((country) => country.code === current);
  return current && !known ? [{ value: current, label: current }, ...options] : options;
}

let isoCountries: readonly Country[] | undefined;

/**
 * Every ISO 3166-1 country, sorted by its English name. Built once, on first use, from the shared ISO codes (`@/lib/isoCountries`) and `Intl.DisplayNames` (a code
 * the browser has no name for is named by its code).
 */
export function allCountries(): readonly Country[] {
  if (!isoCountries) {
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });
    isoCountries = ISO_COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name, 'en'),
    );
  }
  return isoCountries;
}

/**
 * The options of the country menu of a merchant rank (+Add Account and the Profile part): "Choose a country" (empty), then every ISO country as
 * "Name (CODE)" sorted by name. The value is the two-letter code, which is what is sent. A stored code the list does not know stays
 * chosen and is shown as the code, first after the empty option, so an edit never silently moves a merchant to another country.
 */
export function merchantCountryOptions(current = ''): SelectOption[] {
  const options = allCountries().map((country) => ({
    value: country.code,
    label: `${country.name} (${country.code})`,
  }));
  const known = options.some((option) => option.value === current);
  return [
    { value: '', label: 'Choose a country' },
    ...(current && !known ? [{ value: current, label: current }] : []),
    ...options,
  ];
}

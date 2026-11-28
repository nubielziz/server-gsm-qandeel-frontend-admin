// The countries of the Accounts page: every ISO 3166-1 country, for the country menu of an account of either kind of rank and for the list
// filter (decisions 035 and 041). The page used to offer a retail account twelve countries only, a list ported from the demo
// (`B2C_COUNTRIES` in 09-b2c-data.js); the server takes any country for a retail account while the shop has no tax rate in force, and the
// countries of its tax rates otherwise (backend decision 079), so the menu offers them all and the server's refusal shows under the field.
import type { SelectOption } from '@/components/ui';
import { ISO_COUNTRY_CODES } from '@/lib/isoCountries';

export type Country = { code: string; name: string };

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

/** The country's name, or its code when it is not an ISO country. */
export function countryName(code: string): string {
  return allCountries().find((country) => country.code === code)?.name ?? code;
}

/**
 * The options of the country menu of an account (+Add Account and the Profile part, for every kind of rank): "Choose a country" (empty),
 * then every ISO country as "Name (CODE)" sorted by name. The value is the two-letter code, which is what is sent. A stored code the list
 * does not know stays chosen and is shown as the code, first after the empty option, so an edit never silently moves an account to another
 * country.
 */
export function countryOptions(current = ''): SelectOption[] {
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

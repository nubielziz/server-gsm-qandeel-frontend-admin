// The storefront countries, for the country menus and the list filter (ported from the old customers feature; the demo's B2C_COUNTRIES in
// 09-b2c-data.js). The server decides which countries it accepts and which currency an account pays in; this list only names them.
import type { SelectOption } from '@/components/ui';

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

// The countries a tax rate can be for: the ISO 3166-1 alpha-2 codes, named by the browser (`Intl.DisplayNames`), as a menu sorted by name
// (decision 036). The codes are the 249 officially assigned ones; the browser also knows reserved and retired codes (EU, UN, ZZ, SU…) that
// are not countries, so it is only asked for names, never for the list.
import type { SelectOption } from '@/components/ui';
import { ISO_COUNTRY_CODES } from '@/lib/isoCountries';

export { ISO_COUNTRY_CODES };

const ISO_SET: ReadonlySet<string> = new Set(ISO_COUNTRY_CODES);

/** The English name of a country, or `undefined` for a code that is not an assigned ISO country (or when the browser has no names). */
export function regionName(code: string): string | undefined {
  const upper = code.trim().toUpperCase();
  if (!ISO_SET.has(upper)) return undefined;
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(upper);
    return name && name !== upper ? name : undefined;
  } catch {
    return undefined;
  }
}

/** "United Kingdom (GB)": how the menu and the read-only value write a country. A code with no name is written as it is. */
export function countryLabel(code: string): string {
  const name = regionName(code);
  return name ? `${name} (${code.toUpperCase()})` : code;
}

let cached: SelectOption[] | undefined;

/** The menu: every ISO country as "Name (CODE)", sorted by name. The value is the two-letter code that is sent. Built once. */
export function countryMenu(): SelectOption[] {
  cached ??= ISO_COUNTRY_CODES.map((code) => ({ code, name: regionName(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => ({ value: code, label: `${name} (${code})` }));
  return cached;
}

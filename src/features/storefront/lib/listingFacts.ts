// The choices of the listing editor's Brand and Country fields (owner request, 2026-11-17): the brands whose logo the shop
// ships, and the Arab countries. Pure; the editor keeps a brand typed by hand and a country saved before selectable.
import type { SelectOption } from '@/components/ui';

/**
 * The brands the shop has a logo for, as customers read them. They mirror the website's logo files
 * (`storefront/public/images/brands/<slug>.png`, 65 files on 2026-11-17): the shop finds a brand's logo from the name's slug
 * ({@link brandSlug}), so a name picked here always shows its logo. Add a name when a logo is added there.
 */
export const SHOP_BRANDS: readonly string[] = [
  'Alcatel',
  'App Store',
  'Apple',
  'Apple Music',
  'ASUS',
  'BlackBerry',
  'Blackview',
  'Chimera',
  'Discord',
  'Doogee',
  'EA',
  'Epic Games',
  'Facebook',
  'Fairphone',
  'Fortnite',
  'Free Fire',
  'Google',
  'Google Play',
  'HalabTech',
  'Honor',
  'HTC',
  'Huawei',
  'Infinix',
  'Instagram',
  'itel',
  'iTunes',
  'Kaspersky',
  'Kyocera',
  'Lenovo',
  'LG',
  'macOS',
  'Meizu',
  'Motorola',
  'Netflix',
  'Nokia',
  'NordVPN',
  'Octoplus',
  'OnePlus',
  'Oppo',
  'Panasonic',
  'PlayStation',
  'PUBG',
  'Razer',
  'Realme',
  'Riot Games',
  'Roblox',
  'Samsung',
  'Sigma',
  'Snapchat',
  'Sony',
  'Spotify',
  'Steam',
  'TCL',
  'Tecno',
  'Telegram',
  'TikTok',
  'Ulefone',
  'Valorant',
  'Vivo',
  'WhatsApp',
  'Wondershare',
  'Xiaomi',
  'YouTube',
  'Z3X',
  'ZTE',
];

/** The value of the Brand select's last option: the staff member types a name of their own. */
export const OTHER_BRAND = '__other__';

/**
 * A brand name as the shop's logo file name: "App Store" becomes `app-store`. The same rule as the website's `logoSlug`
 * (`storefront/lib/logo-names.ts`).
 *
 * @param name the brand as typed
 * @returns lower-case words joined by hyphens
 */
export function brandSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BRAND_BY_SLUG: ReadonlyMap<string, string> = new Map(
  SHOP_BRANDS.map((name) => [brandSlug(name), name]),
);

/**
 * The shop brand a saved text stands for.
 *
 * @param text the listing's brand
 * @returns the brand of {@link SHOP_BRANDS} with the same slug ("apple" and "APPLE" are Apple), or `null` for an empty text
 *   or a name of the staff member's own
 */
export function shopBrand(text: string): string | null {
  return BRAND_BY_SLUG.get(brandSlug(text)) ?? null;
}

/** The options of the Brand select: none, the shop's brands, then "Other" for a name typed by hand. */
export const BRAND_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'No brand' },
  ...SHOP_BRANDS.map((name) => ({ value: name, label: name })),
  { value: OTHER_BRAND, label: 'Other (type a name)…' },
];

/** The 22 member states of the Arab League, as ISO 3166-1 alpha-2 codes. */
export const ARAB_COUNTRY_CODES: readonly string[] = [
  'AE',
  'BH',
  'DJ',
  'DZ',
  'EG',
  'IQ',
  'JO',
  'KM',
  'KW',
  'LB',
  'LY',
  'MA',
  'MR',
  'OM',
  'PS',
  'QA',
  'SA',
  'SD',
  'SO',
  'SY',
  'TN',
  'YE',
];

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : undefined;

/** "JO" becomes "Jordan"; a code the browser does not know is returned as it is. */
function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The options of the Country select.
 *
 * Why: the owner sells to the Arab countries, so the list is theirs, by name. A listing saved with another country keeps it:
 * that code is offered too, so opening and saving the editor never changes a country by itself.
 *
 * @param saved the listing's country when the editor opened (two letters, or empty)
 * @returns "No country", the Arab countries by name, and the saved country when it is not one of them
 */
export function countryOptions(saved: string): SelectOption[] {
  const code = saved.trim().toUpperCase();
  const arab = ARAB_COUNTRY_CODES.map((value) => ({ value, label: countryName(value) })).sort((a, b) =>
    a.label.localeCompare(b.label, 'en'),
  );
  const options: SelectOption[] = [{ value: '', label: 'No country' }, ...arab];
  if (/^[A-Z]{2}$/.test(code) && !ARAB_COUNTRY_CODES.includes(code)) {
    options.push({ value: code, label: `${countryName(code)} (saved before)` });
  }
  return options;
}

// Country names for the "Who is buying" block. The demo kept a small table (`B2C_COUNTRIES`); the API sends an ISO code, so
// the browser's own region names are used and the console keeps no country table.

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : undefined;

/** "GB" becomes "United Kingdom". A code the browser does not know (or text that is not a code) is returned as it is. */
export function countryName(code: string): string {
  const trimmed = code.trim();
  if (!/^[A-Za-z]{2}$/.test(trimmed)) return trimmed;
  try {
    return regionNames?.of(trimmed.toUpperCase()) ?? trimmed;
  } catch {
    return trimmed;
  }
}

// Display helpers for the tax table: country names, the rate in words, the "Reported through" text and whether a rate is in force
// yet. Ports tabTax of 55-p-settings.js. The server applies the tax; these are only labels.
import type { SelectOption } from '@/components/ui';
import { trimDecimal, isZero } from './decimal';
import type { TaxRate } from '../types';

// The twelve countries of the demo's storefront (MISMATCHES M75: the map has no route for the countries list).
const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  IE: 'Ireland',
  ES: 'Spain',
  IT: 'Italy',
  SE: 'Sweden',
  US: 'United States',
  CA: 'Canada',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
};

/** The country's name when the console knows it, else its code. */
export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

/** The tax kinds the dialog offers (assumed values; any other the server sends is shown as it is). */
export const TAX_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'vat', label: 'VAT' },
  { value: 'gst', label: 'GST' },
  { value: 'sales_tax', label: 'Sales tax' },
  { value: 'none', label: 'No tax' },
];

/** The label of a tax kind. */
export function taxTypeLabel(type: string): string {
  return TAX_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

/** "20% VAT", or "No tax" for a zero rate. */
export function rateText(rate: Pick<TaxRate, 'ratePercent' | 'taxType'>): string {
  return isZero(rate.ratePercent)
    ? 'No tax'
    : `${trimDecimal(rate.ratePercent)}% ${taxTypeLabel(rate.taxType)}`;
}

/** The scheme the tax is reported through, or the demo's "Not collected". */
export function schemeText(rate: Pick<TaxRate, 'ossScheme'>): string {
  return rate.ossScheme.trim() === '' ? 'Not collected' : rate.ossScheme;
}

/** Whether a rate has not started, applies now, or has ended. A hint for the badge; the server picks the rate for each order. */
export function rateWindow(
  rate: Pick<TaxRate, 'validFrom' | 'validTo'>,
  now: number,
): 'scheduled' | 'current' | 'ended' {
  if (rate.validFrom && Date.parse(rate.validFrom) > now) return 'scheduled';
  if (rate.validTo && Date.parse(rate.validTo) < now) return 'ended';
  return 'current';
}

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A date the rate applies from or until, such as "05 Mar 2026". It is a calendar date, so it is shown in UTC. */
export function effectiveDay(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '' : dayFormat.format(ms);
}

/** The value of a date input (`2026-03-05`) for an ISO moment. */
export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

/** The ISO moment (midnight UTC) for a date input, or null when it is empty. */
export function fromDateInput(text: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : null;
}

/** The rates by country name, newest start first within a country. */
export function sortTaxRates(rows: readonly TaxRate[]): TaxRate[] {
  return [...rows].sort(
    (a, b) =>
      countryName(a.country).localeCompare(countryName(b.country)) ||
      Date.parse(b.validFrom ?? '') - Date.parse(a.validFrom ?? ''),
  );
}

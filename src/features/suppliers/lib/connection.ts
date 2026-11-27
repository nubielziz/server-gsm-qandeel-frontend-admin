// What the Connection panel and the connect form say about a supplier: the API types, the limits sentence and the address a
// supplier is linked to. Ports the `conn` block of supDetail and the API type menu of `sup-connect` in 44-p-suppliers.js.
import { dur, money } from '@/lib/format';
import type { Supplier, TestConnectionResult } from '../types';
import { msText } from './metrics';

/**
 * What a new supplier is sent (decision 035): the Dhru driver, because the REST driver cannot be called yet, and the base currency, because
 * the server keeps supplier costs in it and refuses any other. The connect form has no input for either.
 */
export const NEW_SUPPLIER_DRIVER = 'dhru';
export const BASE_CURRENCY = 'USD';

/** The API types the console knows, with the words the demo showed for them (the lists and the Connection panel use them). */
export const DRIVERS = [
  { value: 'dhru', label: 'Dhru Fusion 6.1' },
  { value: 'rest', label: 'REST v2' },
] as const;

/** The demo's name for an API type; a driver the console does not know is shown as the server sent it. */
export function driverLabel(driver: string): string {
  return DRIVERS.find((candidate) => candidate.value === driver)?.label ?? driver;
}

/**
 * The line "Edit connection" shows read-only when a stored supplier has an API type or currency other than what a new one gets, so a
 * value the form does not offer is never hidden; `null` when both are the usual ones.
 */
export function fixedFactsLine(supplier: Pick<Supplier, 'driver' | 'currency'>): string | null {
  if (supplier.driver === NEW_SUPPLIER_DRIVER && supplier.currency === BASE_CURRENCY) return null;
  return `API type: ${driverLabel(supplier.driver)}. Currency: ${supplier.currency}. These are set when a supplier is connected.`;
}

/** The host of a base URL, for the line under the supplier's name ("api.nordicgsm.example"). */
export function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }
}

/** "5 at a time, 60 per minute, 15 s timeout": the limits the console keeps for the supplier. */
export function limitsText(
  supplier: Pick<Supplier, 'maxConcurrency' | 'rateLimitPerMin' | 'timeoutMs'>,
): string {
  return `${supplier.maxConcurrency} at a time, ${supplier.rateLimitPerMin} per minute, ${dur(supplier.timeoutMs)} timeout`;
}

/** The API key as the panel shows it: the first characters the server keeps as a hint, then dots. */
export function maskedKey(hint: string | null): string {
  return hint ? `${hint}••••••••` : '••••••••••••';
}

/** What a good connection test says: who the supplier authenticated, the balance it read and how long the call took. */
export function testSummary(
  result: Pick<TestConnectionResult, 'message' | 'durationMs' | 'accountName' | 'balance'>,
): string {
  const parts = [
    result.accountName ? `Authenticated as ${result.accountName}.` : result.message,
    result.balance ? `Balance ${money(result.balance)}.` : '',
    result.durationMs !== null ? `Answered in ${msText(result.durationMs)}.` : '',
  ].filter(Boolean);
  return parts.join(' ');
}

// What the Connection panel and the connect form say about a supplier: the API types, the limits sentence and the address a
// supplier is linked to. Ports the `conn` block of supDetail and the API type menu of `sup-connect` in 44-p-suppliers.js.
import { dur, money } from '@/lib/format';
import type { Supplier, TestConnectionResult } from '../types';
import { msText } from './metrics';

/** The API types the connect form offers (the demo's two), with the words it showed for them. */
export const DRIVERS = [
  { value: 'dhru', label: 'Dhru Fusion 6.1' },
  { value: 'rest', label: 'REST v2' },
] as const;

/** The demo's name for an API type; a driver the console does not know is shown as the server sent it. */
export function driverLabel(driver: string): string {
  return DRIVERS.find((candidate) => candidate.value === driver)?.label ?? driver;
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

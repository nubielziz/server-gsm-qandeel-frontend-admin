// The words and small conversions of the maintenance controls: the four scopes, the sentence that says what customers get,
// and the `datetime-local` value of the expected end. No demo page (docs/system-health-design.md, "Controls and confirmation").
import { dayKey, fmtDate, fmtTime } from '@/lib/format';
import type { MaintenanceScope } from '../types';

/** One choice of the scope radio. The descriptions follow the contract: what the scope closes. */
export interface ScopeOption {
  value: MaintenanceScope;
  label: string;
  description: string;
}

/** The four scopes in the order of the design. Maintenance never closes the admin console. */
export const SCOPE_OPTIONS: readonly ScopeOption[] = [
  { value: 'store', label: 'Store', description: 'The customer storefront.' },
  { value: 'checkout', label: 'Checkout', description: 'Checkout only. Browsing stays open.' },
  { value: 'api_orders', label: 'API orders', description: 'Orders sent by merchants through the API.' },
  { value: 'all', label: 'All of them', description: 'The store, checkout and API orders.' },
];

const SCOPE_PHRASE: Record<MaintenanceScope, string> = {
  store: 'the store',
  checkout: 'checkout',
  api_orders: 'API orders',
  all: 'the store, checkout and API orders',
};

/** The scope in a sentence: "checkout", "the store, checkout and API orders". Null (or a scope we do not know) is generic. */
export function scopePhrase(scope: MaintenanceScope | null | undefined): string {
  return scope && Object.hasOwn(SCOPE_PHRASE, scope) ? SCOPE_PHRASE[scope] : 'the closed part';
}

/**
 * What turning maintenance on does, stated before the confirm button. Before a scope is chosen it speaks of "the part you
 * choose". A radio group with nothing checked reads as null in the form, so "nothing" is any empty value.
 */
export function effectSentence(scope: MaintenanceScope | '' | null | undefined): string {
  const where = scope ? scopePhrase(scope) : 'the part you choose';
  return `Customers using ${where} get 503 MAINTENANCE with your message until you turn it off. This console is not affected.`;
}

/** What turning maintenance off does. */
export function offSentence(scope: MaintenanceScope | null | undefined): string {
  return `Customers can use ${scopePhrase(scope)} again, and your message stops showing. This takes effect straight away.`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** An ISO time as the value of a `datetime-local` input, in the browser's time zone ("2026-10-31T16:30"). Empty if unreadable. */
export function toLocalInput(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The value of a `datetime-local` input (the browser's time zone) as an ISO time for the API. Null when empty. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** "14:02" for today, "31 Oct, 14:02" for another day; empty when there is no time. For "since" and "expected end". */
export function whenText(iso: string | null | undefined, now: number = Date.now()): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) return '';
  return dayKey(ms) === dayKey(now) ? fmtTime(ms) : fmtDate(ms);
}

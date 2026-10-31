// The words of the maintenance controls: the four scopes and the sentences that say what customers get (the date-time
// conversions live in lib/time.ts). No demo page (docs/system-health-design.md, "Controls and confirmation").
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

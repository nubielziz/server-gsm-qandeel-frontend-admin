// Where an abandoned checkout came from (the demo's "Google · Direct · Blog" under the email), read from the row's `utm` object.
import type { AbandonedCheckout } from '../types';

/** The traffic source the storefront saved with the checkout, or null when there is none. Assumed contract: `utm.source`. */
export function utmSource(checkout: Pick<AbandonedCheckout, 'utm'>): string | null {
  const source = checkout.utm?.source;
  return typeof source === 'string' && source.trim() !== '' ? source : null;
}

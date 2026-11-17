// Addresses into the Storefront page (ARCHITECTURE §5.2): `/storefront?tab=landing&kind=carrier`. Other pages build links
// with `storefrontListPath`; the page reads the same parameters.
import { LANDING_KINDS, type LandingKind } from '../types';
import { DEFAULT_TAB, type StorefrontTab } from './tabs';

/** What a link into the page can set. Defaults are left out of the address. */
export type StorefrontLink = {
  tab?: StorefrontTab;
  /** Landing pages tab: the page type. */
  kind?: LandingKind;
  /** The search text of a list tab. */
  q?: string;
};

/** Whether an address parameter names a landing page type. */
export function isLandingKind(value: string | null): value is LandingKind {
  return LANDING_KINDS.some((kind) => kind === value);
}

/**
 * The address of the Storefront page with some state set: `storefrontListPath({ tab: 'landing', kind: 'carrier' })` is the
 * carrier landing pages, `storefrontListPath({ tab: 'tac', q: '3538' })` searches the TAC catalogue.
 */
export function storefrontListPath(link: StorefrontLink = {}): string {
  const params = new URLSearchParams();
  if (link.tab && link.tab !== DEFAULT_TAB) params.set('tab', link.tab);
  if (link.kind) params.set('kind', link.kind);
  if (link.q) params.set('q', link.q);
  const query = params.toString();
  return query ? `/storefront?${query}` : '/storefront';
}

/**
 * The address of the Retail pricing tab, for the pages that send staff there (Publish says "make a pricing rule", Quick add says
 * "set a retail pricing rule first"). `show: 'all'` lists every price change instead of the proposals that wait.
 */
export function storefrontPricingPath(link: { show?: 'all' } = {}): string {
  const params = new URLSearchParams({ tab: 'pricing' });
  if (link.show) params.set('show', link.show);
  return `/storefront?${params.toString()}`;
}

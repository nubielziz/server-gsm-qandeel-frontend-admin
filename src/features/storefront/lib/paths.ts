// Addresses of the pages this feature links to. Shop content (`/storefront?tab=landing&kind=carrier`) is built with
// `storefrontListPath`; the page reads the same parameters. The publish, pricing and on-the-shop addresses are the Catalog page's
// (`/catalog?view=publish&run=12`, `/catalog?view=settings&tab=shop-prices`, `/catalog?shop=on`), written by its own `catalogPath`.
import { catalogPath } from '@/features/services';
import { LANDING_KINDS, type LandingKind } from '../types';
import { DEFAULT_TAB, type StorefrontTab } from './tabs';

/** What a link into the Shop content page can set. */
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
 * The address of the Shop content page with some state set: `storefrontListPath({ tab: 'landing', kind: 'carrier' })` is the
 * carrier landing pages, `storefrontListPath({ tab: 'tac', q: '3538' })` searches the TAC catalogue. The tab is always written
 * when the link sets any state (a page type or a search text means the Landing pages tab when no tab is named), so an address
 * with a search or a page number never reads as one of the old listing links. `storefrontListPath()` is the bare page.
 */
export function storefrontListPath(link: StorefrontLink = {}): string {
  const tab = link.tab ?? (link.kind || link.q ? DEFAULT_TAB : undefined);
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (link.kind) params.set('kind', link.kind);
  if (link.q) params.set('q', link.q);
  const query = params.toString();
  return query ? `/storefront?${query}` : '/storefront';
}

/**
 * The address of the Catalog page's publish view, for the screens that start a run (Services, Suppliers, Quick add) and for the
 * links between runs: `storefrontPublishPath()` is the start of the view, `storefrontPublishPath(12)` is run 12 (its preview,
 * progress or result).
 */
export function storefrontPublishPath(runId?: number): string {
  return catalogPath({ view: 'publish', run: runId });
}

/**
 * The address of the shop price rules in the Catalog settings, for the screens that send staff there (Publish says "make a
 * pricing rule", Quick add says "set a retail pricing rule first"). `show: 'all'` lists every price change instead of the
 * proposals that wait.
 */
export function storefrontPricingPath(link: { show?: 'all' } = {}): string {
  return catalogPath({ view: 'settings', tab: 'shop-prices', show: link.show });
}

/** The address of the Catalog table narrowed to the services that are on the shop (where a finished run points to). */
export function storefrontOnShopPath(): string {
  return catalogPath({ shop: 'on' });
}

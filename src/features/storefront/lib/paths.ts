// Addresses of the pages this feature links to. Shop content (`/storefront?tab=help&q=refund`) is built with
// `storefrontListPath`; the page reads the same parameters. The publish, pricing and on-the-shop addresses are the Product / Services
// page's (`/products?view=publish&run=12`, `/products?view=rules&tab=shop`, `/products?view=all`), written by its own `productsPath`.
import { productsPath } from '@/features/services';
import { DEFAULT_TAB, type StorefrontTab } from './tabs';

/** What a link into the Shop content page can set. */
export type StorefrontLink = {
  tab?: StorefrontTab;
  /** The search text of a list tab. */
  q?: string;
};

/**
 * The address of the Shop content page with some state set: `storefrontListPath({ tab: 'help', q: 'refund' })` searches the help
 * articles. The tab is always written when the link sets any state (a search text means the default tab when no tab is named), so an
 * address with a search or a page number never reads as one of the old listing links. `storefrontListPath()` is the bare page. The
 * retired tabs (`landing`, `tac`) cannot be named any more; their old addresses still open the first tab (decision 025).
 */
export function storefrontListPath(link: StorefrontLink = {}): string {
  const tab = link.tab ?? (link.q ? DEFAULT_TAB : undefined);
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (link.q) params.set('q', link.q);
  const query = params.toString();
  return query ? `/storefront?${query}` : '/storefront';
}

/**
 * The address of the Product / Services page's Shop Publish view, for the screens that start a run (Services, Suppliers, Quick add)
 * and for the links between runs: `storefrontPublishPath()` is the start of the view, `storefrontPublishPath(12)` is run 12 (its
 * preview, progress or result).
 */
export function storefrontPublishPath(runId?: number): string {
  return productsPath({ view: 'publish', run: runId });
}

/**
 * The address of the shop price rules in the Price Rules view, for the screens that send staff there (Publish says "make a
 * pricing rule", Quick add says "set a retail pricing rule first"). `show: 'all'` lists every price change instead of the
 * proposals that wait.
 */
export function storefrontPricingPath(link: { show?: 'all' } = {}): string {
  return productsPath({ view: 'rules', tab: 'shop', show: link.show });
}

/** The address of the services list (where a finished run points to; the list has no filter for "on the shop" yet). */
export function storefrontOnShopPath(): string {
  return productsPath({ view: 'all' });
}

// The old addresses of the Services & pricing and Storefront pages and where each one goes now (Catalog, or Shop content when the
// address already names one of its tabs). Pure, so every case is a table row in the tests; `LegacyRedirect` runs it before a page's gate.
// The addresses stay for good: stored links (mails, the notification bell, bookmarks) still use them.

// Keys the Catalog table reads; an old Services address carries these and drops what only another view reads.
const TABLE_KEYS: ReadonlySet<string> = new Set([
  'q',
  'type',
  'belowFloor',
  'page',
  'sort',
  'dir',
  'categoryId',
  'supplierId',
  'shop',
  'chip',
  'open',
  'section',
  'add',
  'from',
]);

// The Services tabs that are Catalog settings tabs now (the Services tab itself is the table).
const SETTINGS_TABS: ReadonlySet<string> = new Set(['categories', 'rules', 'resolver', 'inventory']);

// What an old Storefront address with no `tab` keeps when it was the list of services on the shop.
const LIST_KEYS = ['q', 'page', 'sort', 'dir'] as const;

// A view of the Catalog page: `/catalog?view=…`, then the tab, then every other key of the old address in its order (never a second
// `view` or `tab`).
function viewPath(view: 'settings' | 'publish', tab: string | null, old: URLSearchParams): string {
  const params = new URLSearchParams({ view });
  if (tab) params.set('tab', tab);
  for (const [key, value] of old) if (key !== 'tab' && key !== 'view') params.append(key, value);
  return `/catalog?${params.toString()}`;
}

// `/services`: the Services tab is the table, its other tabs are settings tabs. `status=disabled` is the Switched off chip.
function fromServices(old: URLSearchParams): string {
  const tab = old.get('tab');
  if (tab && SETTINGS_TABS.has(tab)) return viewPath('settings', tab, old);
  const params = new URLSearchParams();
  for (const [key, value] of old) {
    if (key === 'status') {
      if (value === 'disabled' && !old.has('chip')) params.append('chip', 'off');
    } else if (TABLE_KEYS.has(key)) params.append(key, value);
  }
  const query = params.toString();
  return query ? `/catalog?${query}` : '/catalog';
}

// `/storefront`: the publish and pricing tabs and the list of services on the shop moved to Catalog; the page's own tabs stay. The
// list was the default tab, so it has no `tab` in its address and is told by its keys; an address that names a tab is Shop content.
function fromStorefront(old: URLSearchParams): string | null {
  const tab = old.get('tab') || null;
  if (tab === 'publish') return viewPath('publish', null, old);
  if (tab === 'pricing') return viewPath('settings', 'shop-prices', old);
  if (tab === 'listings' || (tab === null && LIST_KEYS.some((key) => old.has(key)))) {
    const params = new URLSearchParams({ shop: 'on' });
    for (const [key, value] of old)
      if ((LIST_KEYS as readonly string[]).includes(key)) params.append(key, value);
    return `/catalog?${params.toString()}`;
  }
  return null;
}

/**
 * The address an old one now leads to (path and query), or null when the address is not an old one. `search` may start with `?`.
 * The query is carried; the table keeps only the keys it reads.
 * - `/services` is `/catalog`; `tab=categories|rules|resolver|inventory` is `/catalog?view=settings&tab=…`; `status=disabled` is `chip=off`.
 * - `/storefront?tab=publish` is `/catalog?view=publish`; `tab=pricing` is `/catalog?view=settings&tab=shop-prices`; `tab=listings`, or no
 *   tab and one of `q`, `page`, `sort`, `dir`, is `/catalog?shop=on`.
 * - A bare `/storefront` and a `/storefront` that names one of the Shop content tabs stay where they are (null).
 */
export function legacyTarget(pathname: string, search = ''): string | null {
  const path = pathname.replace(/\/+$/, '').toLowerCase();
  const old = new URLSearchParams(search);
  if (path === '/services') return fromServices(old);
  if (path === '/storefront') return fromStorefront(old);
  return null;
}

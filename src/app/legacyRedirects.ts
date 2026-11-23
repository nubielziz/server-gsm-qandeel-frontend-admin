// The old addresses of the Catalog, Services & pricing and Storefront pages and where each one goes now (Product / Services, or Shop content
// when the address already names one of its tabs). Pure, so every case is a table row in the tests; `LegacyRedirect` runs it before a page's
// gate. The addresses stay for good: stored links (mails, the notification bell, bookmarks) still use them; the backend's mail about
// shop price changes links to `/catalog?view=settings&tab=shop-prices`.

// The Services tabs that are Catalog settings tabs (the Services tab itself is the table), and the Catalog settings tabs.
const SERVICES_SETTINGS_TABS: ReadonlySet<string> = new Set(['categories', 'rules', 'resolver', 'inventory']);
const CATALOG_SETTINGS_TABS: ReadonlySet<string> = new Set([...SERVICES_SETTINGS_TABS, 'shop-prices']);

// What the Catalog chips (`?chip=`) became: the quick filter of the list (`show=`).
const SHOW_OF_CHIP: Readonly<Record<string, string>> = {
  attention: 'attention',
  notonshop: 'offshop',
  off: 'disabled',
};

// What the Catalog panel's sections (`?section=`) became: the parts of the edit view (`part=`).
const PART_OF_SECTION: Readonly<Record<string, string>> = {
  details: 'overview',
  'order-form': 'fields',
  suppliers: 'api',
  prices: 'pricing',
  shop: 'shop',
  activity: 'activity',
};

// What an old Storefront address with no `tab` keeps when it was the list of services on the shop.
const LIST_KEYS: ReadonlySet<string> = new Set(['q', 'page']);

// A whole number from 1 up, as an address writes an id.
const isId = (value: string | null): value is string => value !== null && /^[1-9]\d*$/.test(value);

// A view of the page that carries what is left of the old address: `/products?view=…`, then the tab, then every other key of the old address
// in its order (never a second `view` or `tab`): the price check's service and merchant, the code stock's filters, a run's table state.
function viewPath(view: string, tab: string | null, old: URLSearchParams): string {
  const params = new URLSearchParams({ view });
  if (tab) params.set('tab', tab);
  for (const [key, value] of old) if (key !== 'tab' && key !== 'view') params.append(key, value);
  return `/products?${params.toString()}`;
}

// The quick filter an old address asked for: a chip wins over the old `status=disabled`, which wins over `belowFloor=true` (the services
// under their floor are services that need attention).
function showOf(old: URLSearchParams): string | null {
  const chip = old.get('chip');
  if (chip && chip in SHOW_OF_CHIP) return SHOW_OF_CHIP[chip];
  if (old.get('status') === 'disabled') return 'disabled';
  return old.get('belowFloor') === 'true' ? 'attention' : null;
}

// The list of services (`view=all`): the search, the kind and the page keep their names, the category and supplier filters are now the
// group and the API, the chips are the quick filter; every other key of the old table is dropped. The keys keep the order of the old address.
function listPath(old: URLSearchParams): string {
  const params = new URLSearchParams({ view: 'all' });
  let shown = false;
  for (const [key, value] of old) {
    if (key === 'q' || key === 'type' || key === 'page') params.append(key, value);
    else if (key === 'categoryId') params.append('group', value);
    else if (key === 'supplierId') params.append('api', value);
    else if (key === 'chip' || key === 'status' || key === 'belowFloor') {
      const show = showOf(old);
      if (show && !shown) params.append('show', show);
      shown = shown || show !== null;
    }
  }
  return `/products?${params.toString()}`;
}

// The kind of an old address (the table's `type` filter), when it had one: the add and edit views are about a kind.
function withKind(params: URLSearchParams, old: URLSearchParams): void {
  const type = old.get('type');
  if (type) params.set('type', type);
}

// `?add=<supplier id>|new[&from=groups|services]`: the Add services flow, now the add view with the supplier chosen.
function addPath(old: URLSearchParams): string {
  const params = new URLSearchParams({ view: 'add' });
  withKind(params, old);
  const supplier = old.get('add');
  if (isId(supplier)) params.set('supplier', supplier);
  const from = old.get('from');
  if (supplier !== 'new' && (from === 'groups' || from === 'services')) params.set('from', from);
  return `/products?${params.toString()}`;
}

// `?open=<id>[&section=…]`: the service panel, now the edit view on the part the section became.
function editPath(old: URLSearchParams): string {
  const params = new URLSearchParams({ view: 'edit' });
  withKind(params, old);
  params.set('id', old.get('open') ?? '');
  const part = PART_OF_SECTION[old.get('section') ?? ''];
  if (part) params.set('part', part);
  return `/products?${params.toString()}`;
}

// The Catalog table (or the old Services table): the add flow and the panel have views of their own, the rest is the list.
function fromTable(old: URLSearchParams): string {
  if (old.has('add')) return addPath(old);
  if (isId(old.get('open'))) return editPath(old);
  return listPath(old);
}

// A settings tab of the old Catalog (and the old Services page's tabs): the categories are the groups, the merchant price rules, the shop
// price rules and the price resolver are the three tabs of Price Rules, the code inventory is the Inventory view. No tab, or an unknown one,
// opened the first tab: the categories.
function fromSettingsTab(tab: string | null, old: URLSearchParams): string {
  switch (tab) {
    case 'rules':
      return viewPath('rules', 'merchant', old);
    case 'shop-prices':
      return viewPath('rules', 'shop', old);
    case 'resolver':
      return viewPath('rules', 'check', old);
    case 'inventory':
      return viewPath('inventory', null, old);
    default:
      return '/products?view=groups';
  }
}

// `/services`: the Services tab is the table, its other tabs are settings tabs.
function fromServices(old: URLSearchParams): string {
  const tab = old.get('tab');
  return tab && SERVICES_SETTINGS_TABS.has(tab) ? fromSettingsTab(tab, old) : fromTable(old);
}

// `/catalog`: the publish view, the settings view (an address with no view that names a settings tab is the settings view too), or the table.
function fromCatalog(old: URLSearchParams): string {
  const view = old.get('view');
  if (view === 'publish') return viewPath('publish', null, old);
  const tab = old.get('tab');
  if (view === 'settings' || (view === null && tab !== null && CATALOG_SETTINGS_TABS.has(tab))) {
    return fromSettingsTab(tab, old);
  }
  return fromTable(old);
}

// `/storefront`: the publish and pricing tabs and the list of services on the shop moved; the page's own tabs stay. The list was the default
// tab, so it has no `tab` in its address and is told by its keys; an address that names a tab is Shop content.
function fromStorefront(old: URLSearchParams): string | null {
  const tab = old.get('tab') || null;
  if (tab === 'publish') return viewPath('publish', null, old);
  if (tab === 'pricing') return viewPath('rules', 'shop', old);
  if (tab === 'listings' || (tab === null && ['q', 'page', 'sort', 'dir'].some((key) => old.has(key)))) {
    const params = new URLSearchParams({ view: 'all' });
    for (const [key, value] of old) if (LIST_KEYS.has(key)) params.append(key, value);
    return `/products?${params.toString()}`;
  }
  return null;
}

/**
 * The address an old one now leads to (path and query), or null when the address is not an old one. `search` may start with `?`.
 * - `/catalog` and `/services` with table keys is `/products?view=all`: `q`, `type` and `page` stay, `categoryId` is `group`, `supplierId`
 *   is `api`, `chip=attention|notonshop|off` is `show=attention|offshop|disabled` (so are `status=disabled` and `belowFloor=true`, which is
 *   `show=attention`); the other table keys are dropped.
 * - `?open=<id>&section=details|order-form|suppliers|prices|shop|activity` is `/products?view=edit&id=<id>&part=overview|fields|api|pricing|shop|activity`.
 * - `?add=<supplier id>|new[&from=groups|services]` is `/products?view=add[&supplier=<id>&from=…]`.
 * - `?view=settings&tab=categories` is `view=groups`; `tab=rules|shop-prices|resolver` is `view=rules&tab=merchant|shop|check`;
 *   `tab=inventory` is `view=inventory`. `?view=publish[&run=N]` stays `view=publish`. The keys a view reads itself are carried.
 * - `/services` follows its tabs the same way (`tab=categories|rules|resolver|inventory`).
 * - `/storefront?tab=publish` is `view=publish`; `tab=pricing` is `view=rules&tab=shop`; `tab=listings`, or no tab and one of `q`,
 *   `page`, `sort`, `dir`, is `view=all` with `q` and `page`.
 * - A bare `/storefront` and a `/storefront` that names one of the Shop content tabs stay where they are (null).
 */
export function legacyTarget(pathname: string, search = ''): string | null {
  const path = pathname.replace(/\/+$/, '').toLowerCase();
  const old = new URLSearchParams(search);
  if (path === '/services') return fromServices(old);
  if (path === '/catalog') return fromCatalog(old);
  if (path === '/storefront') return fromStorefront(old);
  return null;
}

// The old addresses of the Catalog, Services & pricing, Storefront, Commissions, Abandoned checkouts, Merchants and Customers pages and where
// each one goes now (Product / Services, Shop content when the address already names one of its tabs, Finance for the retired Commissions
// page, the sales funnel report of Finance for the retired checkouts page, and Accounts for the two pages that became one). Pure, so every
// case is a table row in the tests; `LegacyRedirect` runs it before a page's gate. The addresses stay for good: stored links (mails, the
// notification bell, bookmarks) still use them; the backend's mail about shop price changes links to `/catalog?view=settings&tab=shop-prices`.
import {
  accountPath,
  accountsListPath,
  legacyAccountPath,
  ranksPath,
  type AccountsListState,
  type AccountTab,
} from '@/features/accounts';

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

// The days the sales funnel report offers. 30 is its default, so it leaves no trace in the address.
const FUNNEL_DAYS: ReadonlySet<string> = new Set(['7', '90']);

// `/checkouts`: the page of abandoned checkouts is gone and no list replaces it. What stays of it is the sales funnel, which is the
// Funnel report of the Finance page now; its `days` period is that report's `range`. The list's own filter, search, page and sort are dropped.
function fromCheckouts(old: URLSearchParams): string {
  const params = new URLSearchParams({ tab: 'reports', report: 'funnel' });
  const days = old.get('days');
  if (days && FUNNEL_DAYS.has(days)) params.set('range', days);
  return `/finance?${params.toString()}`;
}

// ---- Merchants and Customers: one Accounts page (decision 023) ----

// A whole number from 1 up that a number can hold exactly, as an address writes an id; undefined for anything else.
function idOf(value: string | null): number | undefined {
  if (!isId(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

// The sorts the old merchant table had. The Accounts list reads both; any other sort of an old address is dropped.
const MERCHANT_SORTS: ReadonlySet<string> = new Set(['name', 'status']);

// What the tabs of a merchant's record became, as parts of an account's record: Billing is the Invoices part, Pricing the Prices part and
// API access the API part, Profile has a part of its own. A tab the record no longer has (the retired Verification) or never had leaves the
// record on its first part, so it is not in the table.
const MERCHANT_PARTS: ReadonlyMap<string, AccountTab> = new Map([
  ['orders', 'orders'],
  ['wallet', 'wallet'],
  ['billing', 'invoices'],
  ['pricing', 'prices'],
  ['api', 'api'],
  ['profile', 'profile'],
  ['security', 'security'],
  ['audit', 'audit'],
]);

// The same for the tabs of a customer's record: its Account tab is the Security part, and its Consents and Risk tabs are both Privacy and risk.
const CUSTOMER_PARTS: ReadonlyMap<string, AccountTab> = new Map([
  ['orders', 'orders'],
  ['account', 'security'],
  ['wallet', 'wallet'],
  ['support', 'support'],
  ['consents', 'privacy'],
  ['risk', 'privacy'],
]);

// The chip of the list page's first design that no address of the page writes any more: `chip=requests` is the Data requests view. The page
// still reads it (and the old `chip=suspended` and `chip=blocked`, which are the status filter, for bookmarks), so the redirect puts the chip
// in front of the keys `accountsListPath` wrote. A Suspended or Blocked tab is not written this way: it keeps its population and says the
// status (`chip=merchants&status=suspended`), because `chip=suspended` alone lists the suspended accounts of every kind.
function withRequestsChip(state: AccountsListState): string {
  const [, query = ''] = accountsListPath(state).split('?');
  return `/accounts?${new URLSearchParams([['chip', 'requests'], ...new URLSearchParams(query)]).toString()}`;
}

// `/merchants`: the Merchants chip of the Accounts list. `group` is `rank`; the search, the page and the table's two sorts stay. The
// Suspended tab is the list of suspended merchants, the Groups tab is the Ranks view, and every other tab (Active, the retired Pending and
// Verification, an unknown one) is the plain Merchants chip.
function fromMerchants(old: URLSearchParams): string {
  const tab = old.get('tab');
  if (tab === 'groups') return ranksPath();
  const state: AccountsListState = { q: old.get('q') ?? '', page: idOf(old.get('page')) };
  const rank = idOf(old.get('group'));
  if (rank !== undefined) state.rank = rank;
  const sort = old.get('sort');
  if (sort && MERCHANT_SORTS.has(sort)) {
    state.sort = sort;
    // The old table sorted ascending unless the address said `dir=desc`, as the Accounts list does.
    state.dir = old.get('dir') === 'desc' ? 'desc' : 'asc';
  }
  return accountsListPath({
    ...state,
    chip: 'merchants',
    ...(tab === 'suspended' ? { status: 'suspended' } : {}),
  });
}

// `/customers`: the Retail chip. The search, the country and the page stay; the sort does not, because the old default (biggest spender
// first) and its columns have no counterpart. The Suspended and Blocked tabs are those lists of retail accounts, the Data requests tab is that
// view (it keeps only its page), and Active, the retired Flagged and an unknown tab are the plain Retail chip.
function fromCustomers(old: URLSearchParams): string {
  const tab = old.get('tab');
  const page = idOf(old.get('page'));
  if (tab === 'requests') return withRequestsChip({ page });
  const country = old.get('country');
  const state: AccountsListState = {
    q: old.get('q') ?? '',
    ...(country && /^[A-Za-z]{2}$/.test(country) ? { country: country.toUpperCase() } : {}),
    page,
  };
  return accountsListPath({
    ...state,
    chip: 'retail',
    ...(tab === 'suspended' || tab === 'blocked' ? { status: tab } : {}),
  });
}

// `/merchants/:id`: a merchant keeps its number, so this is the account of that number, on the part its tab became; an open order stays open.
function fromMerchantRecord(rawId: string, old: URLSearchParams): string | null {
  const id = idOf(rawId);
  if (id === undefined) return null;
  const order = idOf(old.get('order'));
  return accountPath(id, MERCHANT_PARTS.get(old.get('tab') ?? ''), order === undefined ? {} : { order });
}

// `/customers/:id`: a customer's number is NOT an account number (the customers were copied after the merchants), so the address says
// `from=customer` and the page asks the server which account that customer became. It never shows the account that has the same number.
function fromCustomerRecord(rawId: string, old: URLSearchParams): string | null {
  const id = idOf(rawId);
  if (id === undefined) return null;
  return legacyAccountPath('customer', id, CUSTOMER_PARTS.get(old.get('tab') ?? ''));
}

// `/merchants/<id>` and `/customers/<id>`, with nothing after the id.
const RECORD_PATH = /^\/(merchants|customers)\/([^/]+)$/;

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
 * - `/commissions` is `/finance` whatever its query: the page is gone, and Finance still lists the old commission entries in its
 *   ledger. Nothing of the old query (tab, status, agent) means anything there, so none of it is carried.
 * - `/checkouts` is `/finance?tab=reports&report=funnel`; `days=7` or `days=90` is `range=7` or `range=90`, any other key is dropped.
 * - `/merchants` is `/accounts?chip=merchants` (`q`, `page` and `sort=name|status` with `dir` stay, `group` is `rank`); `tab=suspended` adds
 *   `status=suspended`, `tab=groups` is `view=ranks`, any other tab is `chip=merchants`.
 * - `/customers` is `/accounts?chip=retail` (`q`, `country` and `page` stay); `tab=suspended|blocked` adds `status=suspended|blocked`,
 *   `tab=requests` is `chip=requests`, any other tab is `chip=retail`.
 * - `/merchants/<id>` is `/accounts/<id>` (a merchant keeps its number) and `tab=orders|wallet|billing|pricing|api|profile|security|audit` is
 *   `tab=orders|wallet|invoices|prices|api|profile|security|audit`; `order` stays.
 * - `/customers/<id>` is `/accounts/<id>?from=customer` (the page asks which account that customer became) and
 *   `tab=orders|account|wallet|support|consents|risk` is `tab=orders|security|wallet|support|privacy|privacy`.
 * - An id that is not a whole number from 1 up, and any address below the record, is not an old address (null).
 */
export function legacyTarget(pathname: string, search = ''): string | null {
  const path = pathname.replace(/\/+$/, '').toLowerCase();
  const old = new URLSearchParams(search);
  if (path === '/services') return fromServices(old);
  if (path === '/catalog') return fromCatalog(old);
  if (path === '/storefront') return fromStorefront(old);
  if (path === '/commissions') return '/finance';
  if (path === '/checkouts') return fromCheckouts(old);
  if (path === '/merchants') return fromMerchants(old);
  if (path === '/customers') return fromCustomers(old);
  const record = RECORD_PATH.exec(path);
  if (record)
    return record[1] === 'merchants'
      ? fromMerchantRecord(record[2], old)
      : fromCustomerRecord(record[2], old);
  return null;
}

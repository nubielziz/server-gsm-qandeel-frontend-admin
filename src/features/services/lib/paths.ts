// Addresses into and out of the Catalog page (ARCHITECTURE §5.2): `catalogPath` builds every Catalog address (the table with its
// filters, a service panel, the settings view with its tab, the publish view with a run), so a link inside the app never takes the
// redirect of an old address. The supplier and merchant pages this page links to are here too.
import type { InventoryStatus, ServiceSortField, ServiceType } from '../types';
import type { CATALOG_CHIPS } from './filters';

/** The Catalog page. Its views are `/catalog?view=settings` and `/catalog?view=publish`; the table is the page without a view. */
export const CATALOG_PATH = '/catalog';

/** The chips above the table: the services that need attention, those that are not on the shop, those that are switched off. */
export type CatalogChip = (typeof CATALOG_CHIPS)[number];

/** The tabs of the Catalog settings view. */
export type CatalogSettingsTab = 'categories' | 'rules' | 'shop-prices' | 'resolver' | 'inventory';

/**
 * A link into the table (the page without a view). Defaults are left out of the address: a first page, no filter. `open` shows
 * one service in the side panel (`section` names the part of the panel to show), `add` opens the Add services flow with a supplier
 * chosen (or `new` for a service of the staff member's own), and `from` says which way the flow starts.
 */
export type CatalogTableLink = {
  view?: undefined;
  q?: string;
  type?: ServiceType;
  categoryId?: number;
  supplierId?: number;
  belowFloor?: boolean;
  /** `on`: only the services that are on the shop. */
  shop?: 'on';
  chip?: CatalogChip;
  page?: number;
  sort?: ServiceSortField;
  dir?: 'asc' | 'desc';
  open?: number;
  section?: string;
  add?: number | 'new';
  from?: 'groups' | 'services';
};

/**
 * A link into the settings view. What else the address holds depends on the tab, as each tab keeps its own state there: the price
 * resolver its service and merchant, the code inventory its service, status and page, the shop price rules their `show` choice.
 * Without a tab the view opens on the first tab the role may use.
 */
export type CatalogSettingsLink =
  | { view: 'settings'; tab?: 'categories' | 'rules' }
  | { view: 'settings'; tab: 'resolver'; service?: number; merchant?: number }
  | { view: 'settings'; tab: 'inventory'; service?: number; status?: InventoryStatus; page?: number }
  | { view: 'settings'; tab: 'shop-prices'; show?: 'all' };

/** A link into the publish view: its start (no `run`) or one run, which shows its preview, progress or result. */
export type CatalogPublishLink = { view: 'publish'; run?: number };

/** What a link into the Catalog page can set. */
export type CatalogLink = CatalogTableLink | CatalogSettingsLink | CatalogPublishLink;

// Writes a parameter only when it has a value; an empty text and an absent number are left out.
function put(params: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value !== undefined && value !== '') params.set(key, String(value));
}

/**
 * The address of the Catalog page with some state set: `catalogPath({ belowFloor: true })` is the services priced under their
 * floor, `catalogPath({ open: 7, section: 'prices' })` is the panel of service 7 on its prices,
 * `catalogPath({ view: 'settings', tab: 'resolver', service: 4 })` traces service 4 and `catalogPath({ view: 'publish', run: 12 })`
 * is run 12. A table link never carries the keys of another view, and a first page is left out.
 */
export function catalogPath(link: CatalogLink = {}): string {
  const params = new URLSearchParams();
  switch (link.view) {
    case 'settings':
      params.set('view', 'settings');
      put(params, 'tab', link.tab);
      if (link.tab === 'resolver') {
        put(params, 'service', link.service);
        put(params, 'merchant', link.merchant);
      } else if (link.tab === 'inventory') {
        put(params, 'status', link.status);
        put(params, 'service', link.service);
        if (link.page !== undefined && link.page > 1) put(params, 'page', link.page);
      } else if (link.tab === 'shop-prices') {
        put(params, 'show', link.show);
      }
      break;
    case 'publish':
      params.set('view', 'publish');
      put(params, 'run', link.run);
      break;
    default:
      put(params, 'shop', link.shop);
      put(params, 'chip', link.chip);
      put(params, 'q', link.q);
      put(params, 'type', link.type);
      put(params, 'categoryId', link.categoryId);
      put(params, 'supplierId', link.supplierId);
      if (link.belowFloor) params.set('belowFloor', 'true');
      if (link.page !== undefined && link.page > 1) put(params, 'page', link.page);
      put(params, 'sort', link.sort);
      put(params, 'dir', link.dir);
      put(params, 'open', link.open);
      put(params, 'section', link.section);
      put(params, 'add', link.add);
      put(params, 'from', link.from);
  }
  const query = params.toString();
  return query ? `${CATALOG_PATH}?${query}` : CATALOG_PATH;
}

/** One supplier on the Suppliers page (the suppliers feature will export its own `supplierPath`; same address). */
export function supplierLink(id: number): string {
  return `/suppliers?supplier=${id}`;
}

/** The merchant groups, which are managed on the merchants page. */
export const MERCHANT_GROUPS_PATH = '/merchants?tab=groups';

/** Where the demo's empty state sent "Import from supplier": the suppliers page imports services. */
export const SUPPLIERS_PATH = '/suppliers';

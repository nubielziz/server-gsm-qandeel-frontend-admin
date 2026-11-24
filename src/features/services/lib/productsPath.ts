// Addresses of the Product / Services page (decision 022, replacing the Catalog page's addresses): `productsPath` is the only builder
// of them, so a link inside the app never takes the redirect of an old address (src/app/legacyRedirects.ts). The page has one address
// (`/products`); the kind of service (`type`) and the view (`view`) are parameters, and every other key belongs to one view.
import type { Id } from '@/lib/api';
import { SERVICE_TYPES, type ServiceType } from '@/lib/serviceTypes';

/** The Product / Services page. */
export const PRODUCTS_PATH = '/products';

/**
 * The views of the page. `all`, `pricing`, `add`, `groups` and `add-group` are the five links of its first row; `rules`, `publish`
 * and `inventory` are the three that follow a divider; `edit` (one service) and `edit-group` (one group) are reached from a row and
 * have no link of their own.
 */
export const PRODUCTS_VIEWS = [
  'all',
  'pricing',
  'add',
  'groups',
  'add-group',
  'rules',
  'publish',
  'inventory',
  'edit',
  'edit-group',
] as const;
export type ProductsViewId = (typeof PRODUCTS_VIEWS)[number];

/** The parts of one service in its edit view, in the order the left menu shows them. */
export const SERVICE_PARTS = [
  'overview',
  'pricing',
  'fields',
  'api',
  'shop',
  'inventory',
  'activity',
] as const;
export type ServicePartId = (typeof SERVICE_PARTS)[number];

/** The kind the page opens on when the address names none. */
export const DEFAULT_KIND: ServiceType = 'imei';

/** The sub-views of the Price Rules view (`tab=`): the merchant price rules, the shop price rules and the price check. */
export const RULES_TABS = ['merchant', 'shop', 'check'] as const;
export type RulesTabId = (typeof RULES_TABS)[number];

/**
 * What a link into the page can set. `type` is the kind of service (the strip of tabs); `view` the view. The other keys belong to one
 * view: `group`, `q`, `api`, `show`, `page` and `size` the list (All; `q`, `group` and `page` also the price grid), `id` and `part`
 * the edit view, `supplier` and `from` the add view with a supplier chosen, `run` one publish run and `tab` a sub-view of Price Rules.
 * `return` says where the +Add Group view goes after Add: `add` is back to +Add Service (its "Add New Group" link), with the new group chosen.
 */
export type ProductsLink = {
  type?: ServiceType;
  view?: ProductsViewId;
  group?: Id;
  q?: string;
  api?: Id;
  /** The list's quick filter (All view); `all` is the shop price rules' list of every price change (`view=rules&tab=shop`). */
  show?: 'attention' | 'offshop' | 'disabled' | 'all';
  page?: number;
  size?: number;
  id?: Id;
  part?: ServicePartId;
  supplier?: Id;
  from?: 'groups' | 'services';
  return?: 'add';
  run?: Id;
  tab?: string;
};

// Writes a parameter only when it has a value; an empty text and an absent number are left out.
function put(params: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value !== undefined && value !== '') params.set(key, String(value));
}

/**
 * The address of the Product / Services page with some state set: `productsPath({ type: 'server', view: 'groups' })` is the groups of
 * the Server kind, `productsPath({ view: 'edit', id: 7, part: 'pricing' })` is service 7 on its pricing part and
 * `productsPath({ view: 'publish', run: 12 })` is publish run 12. The keys are written in one fixed order, and a first page is left
 * out; `productsPath()` is the bare page, which opens the first view the role may use.
 */
export function productsPath(link: ProductsLink = {}): string {
  const params = new URLSearchParams();
  put(params, 'view', link.view);
  put(params, 'type', link.type);
  put(params, 'id', link.id);
  put(params, 'part', link.part);
  put(params, 'tab', link.tab);
  put(params, 'group', link.group);
  put(params, 'q', link.q);
  put(params, 'api', link.api);
  put(params, 'show', link.show);
  if (link.page !== undefined && link.page > 1) put(params, 'page', link.page);
  put(params, 'size', link.size);
  put(params, 'supplier', link.supplier);
  put(params, 'from', link.from);
  put(params, 'return', link.return);
  put(params, 'run', link.run);
  const query = params.toString();
  return query ? `${PRODUCTS_PATH}?${query}` : PRODUCTS_PATH;
}

/** The kind an address parameter names; anything else (a missing or unknown value) is the default kind. */
export function parseKind(raw: string | null): ServiceType {
  return SERVICE_TYPES.find((kind) => kind === raw) ?? DEFAULT_KIND;
}

/** Whether an address parameter names one of the views. */
export function isProductsView(raw: string | null): raw is ProductsViewId {
  return PRODUCTS_VIEWS.some((view) => view === raw);
}

/** The part an address parameter names, or null when it names none or an unknown one. */
export function parsePart(raw: string | null): ServicePartId | null {
  return SERVICE_PARTS.find((part) => part === raw) ?? null;
}

/** The service or group an address names (`id=7`), or null when it names none or something that is not an id. */
export function parseRecordId(raw: string | null): Id | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

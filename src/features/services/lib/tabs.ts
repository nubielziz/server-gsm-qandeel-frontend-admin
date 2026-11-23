// The Catalog page's three views and the tabs of its settings view, with the permissions each one needs, and the page's gate. The
// services table is the default view (no `view` in the address); the settings (`?view=settings&tab=rules`) and the publish runs
// (`?view=publish&run=12`) are the other two, and only one of them is mounted at a time. `catalogPath` (paths.ts) writes their addresses.
import type { Id } from '@/lib/api';
import type { CatalogLink, CatalogSettingsTab } from './paths';

export type { CatalogSettingsTab };

/** The page's heading, the same in every view. */
export const CATALOG_HEADING = 'Catalog';

/** The page's views, in the order a role falls back through them. */
export type CatalogView = 'table' | 'settings' | 'publish';
export const CATALOG_VIEWS: readonly CatalogView[] = ['table', 'settings', 'publish'];

/**
 * The view an address names: `view=settings` or `view=publish`. An address with no view that names a settings tab (`?tab=resolver`,
 * as the old page's tab links read) is the settings view too, so the table never holds a `tab`; anything else is the table.
 */
export function parseView(params: URLSearchParams): CatalogView {
  const raw = params.get('view');
  if (raw === 'settings' || raw === 'publish') return raw;
  return raw === null && isSettingsTab(params.get('tab')) ? 'settings' : 'table';
}

/**
 * One settings tab. `permissions` are all needed to use it: the resolver reads prices (`pricing:read`) and must list services to
 * choose from (`catalog:read`). Hiding a tab is a hint; the server still checks each call.
 */
export type SettingsTabSpec = { id: CatalogSettingsTab; label: string; permissions: readonly string[] };

/** The settings tabs in the order the view shows them; the first one the role may open is the default. */
export const SETTINGS_TABS: readonly SettingsTabSpec[] = [
  { id: 'categories', label: 'Categories', permissions: ['catalog:read'] },
  { id: 'rules', label: 'Merchant price rules', permissions: ['pricing:read'] },
  { id: 'shop-prices', label: 'Shop price rules', permissions: ['pricing:read'] },
  { id: 'resolver', label: 'Price resolver', permissions: ['pricing:read', 'catalog:read'] },
  { id: 'inventory', label: 'Code inventory', permissions: ['inventory:read'] },
];

/** Whether an address parameter names a settings tab. */
export function isSettingsTab(value: string | null): value is CatalogSettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

/** The table lists services (`GET /admin/services`); without this permission it is never mounted or read. */
export const TABLE_PERMISSION = 'catalog:read';

/** The publish view lists the runs; starting one needs `storefront:create`, which the start screen checks itself. */
export const PUBLISH_PERMISSION = 'storefront:read';

/**
 * The page gate (the feature manifest's `permission`; MISMATCHES M19 has the same shape for other pages): any one of these opens the
 * page. The table and the categories need `catalog:read`, the price rules and the shop price rules `pricing:read`, the code stock
 * `inventory:read`, the publish runs `storefront:read`. A role with none of them has nothing on this page, so it is refused at the
 * door; a role with one opens the first view it may use. The server still checks every call.
 */
export const PAGE_PERMISSIONS = [
  'catalog:read',
  'pricing:read',
  'inventory:read',
  'storefront:read',
] as const;

/** Which views a role may use. */
export type ViewAccess = Record<CatalogView, boolean>;

/** The views a role may use, from its permissions and the settings tabs it may open. */
export function viewAccess(can: (permission: string) => boolean, settingsTabs: number): ViewAccess {
  return { table: can(TABLE_PERMISSION), settings: settingsTabs > 0, publish: can(PUBLISH_PERMISSION) };
}

/**
 * The view to show: the one the address names when the role may use it, else the first one it may use (the table, the settings on
 * their first tab, the publish runs). Null when the role may use none.
 */
export function resolveView(requested: CatalogView, access: ViewAccess): CatalogView | null {
  if (access[requested]) return requested;
  return CATALOG_VIEWS.find((view) => access[view]) ?? null;
}

/** The address that opens a view clean: the bare page for the table, `view=settings` (its first tab) or `view=publish` (its start). */
export function viewLink(view: CatalogView): CatalogLink {
  if (view === 'settings') return { view: 'settings' };
  if (view === 'publish') return { view: 'publish' };
  return {};
}

/** The run an address names (`run=12`), or null when it names none or something that is not a run id. */
export function parseRunId(raw: string | null): Id | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

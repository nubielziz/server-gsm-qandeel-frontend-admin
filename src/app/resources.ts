// Refine resources of the app: the 16 pages of the demo's ROUTES (90-app.js) plus System health (no demo page), with
// the data the sidebar, palette and access checks need, and the registry that serves Refine's data hooks.
import type { IResourceItem, ResourceProps } from '@refinedev/core';
import type { IconName } from '@/components/ui';
import { mergeRegistries } from '@/lib/api';
import { featureForPage, featureManifests } from './features';

/** Sidebar sections, in the order the demo shows them. */
export const NAV_GROUPS = ['Operations', 'Catalog', 'Money', 'System'] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

/**
 * What every page resource keeps in its Refine `meta`. `permission` is checked by the access-control provider; a list
 * means any one of them opens the page (for pages whose tabs need different permissions).
 */
export type PageMeta = {
  label: string;
  group: NavGroup;
  icon: IconName;
  permission: string | readonly string[];
};

// One page resource. `detail` adds the `/<id>/:id` route of the pages that have a detail view (merchants, customers).
// A built feature may replace the page permission from its manifest (any-of lists for pages with per-tab permissions).
function page(name: string, meta: PageMeta, detail = false): ResourceProps {
  const permission = featureForPage(name)?.page?.permission ?? meta.permission;
  return {
    name,
    list: `/${name}`,
    ...(detail ? { show: `/${name}/:id` } : {}),
    meta: { ...meta, permission },
  };
}

/** Page resources: the ids, labels, groups and icons are the demo's; permissions follow the map. */
export const resources: ResourceProps[] = [
  page('dashboard', {
    label: 'Dashboard',
    group: 'Operations',
    icon: 'dashboard',
    permission: 'dashboard:read',
  }),
  page('orders', { label: 'Orders', group: 'Operations', icon: 'orders', permission: 'orders:read' }),
  page(
    'merchants',
    { label: 'Merchants', group: 'Operations', icon: 'users', permission: 'clients:read' },
    true,
  ),
  page(
    'customers',
    { label: 'Customers', group: 'Operations', icon: 'user', permission: 'customers:read' },
    true,
  ),
  page('support', { label: 'Support', group: 'Operations', icon: 'life', permission: 'support:read' }),
  page('risk', { label: 'Risk & checks', group: 'Operations', icon: 'shield', permission: 'risk:read' }),
  page('checkouts', {
    label: 'Abandoned checkouts',
    group: 'Operations',
    icon: 'mail',
    permission: 'growth:read',
  }),
  page('services', {
    label: 'Services & pricing',
    group: 'Catalog',
    icon: 'tag',
    permission: 'catalog:read',
  }),
  page('suppliers', { label: 'Suppliers', group: 'Catalog', icon: 'server', permission: 'suppliers:read' }),
  page('storefront', { label: 'Storefront', group: 'Catalog', icon: 'store', permission: 'storefront:read' }),
  page('finance', { label: 'Finance', group: 'Money', icon: 'wallet', permission: 'ledger:read' }),
  page('commissions', {
    label: 'Commissions',
    group: 'Money',
    icon: 'percent',
    permission: 'commissions:read',
  }),
  page('refunds', { label: 'Refunds & disputes', group: 'Money', icon: 'undo', permission: 'refunds:read' }),
  // The access feature's manifest widens this to any tab's read permission (MISMATCHES M19).
  page('access', { label: 'Admins & access', group: 'System', icon: 'lock', permission: 'staff:read' }),
  page('settings', { label: 'Settings', group: 'System', icon: 'sliders', permission: 'settings:read' }),
  page('audit', { label: 'Audit log', group: 'System', icon: 'history', permission: 'audit:read' }),
  // No demo page (docs/system-health-design.md). The feature's manifest widens this to alerts and incidents readers.
  page('system-health', {
    label: 'System health',
    group: 'System',
    icon: 'pulse',
    permission: 'system:read',
  }),
];

/**
 * Which API function serves each CRUD resource for Refine's data hooks (decision 005): the registries of every
 * feature manifest, merged.
 */
export const dataRegistry = mergeRegistries(
  ...featureManifests.flatMap((manifest) => (manifest.registry ? [manifest.registry] : [])),
);

/** A resource that is a console page, with its `meta` checked. Resources without page meta give undefined. */
export type PageResource = {
  name: string;
  meta: PageMeta;
  /** Path of the list view (`/orders`). */
  path: string;
  /** Path pattern of the detail view (`/merchants/:id`), for the pages that have one. */
  detailPath?: string;
};

function isPageMeta(meta: unknown): meta is PageMeta {
  const m = meta as Partial<PageMeta> | undefined;
  return (
    typeof m?.label === 'string' &&
    (typeof m.permission === 'string' ||
      (Array.isArray(m.permission) && m.permission.every((p) => typeof p === 'string'))) &&
    typeof m.icon === 'string' &&
    NAV_GROUPS.includes(m.group as NavGroup)
  );
}

/** Reads a Refine resource as a console page; undefined for resources that are not pages. */
export function toPageResource(
  resource: IResourceItem | ResourceProps | undefined,
): PageResource | undefined {
  if (!resource || typeof resource.list !== 'string' || !isPageMeta(resource.meta)) return undefined;
  return {
    name: resource.name,
    meta: resource.meta,
    path: resource.list,
    detailPath: typeof resource.show === 'string' ? resource.show : undefined,
  };
}

// Permission lists for the roles tab: reading `GET /admin/permissions`, grouping permissions by their prefix for the
// role dialog, and the read-only "what each role can do" summary. The summary is inspired by ROLE_AREAS and
// ROLE_MATRIX of 14-state-access.js; the levels are worked out from each role's real permissions (MISMATCHES M11).
import { hasPermission } from '@/lib/auth/permissions';
import type { Permission, PermissionsAnswer, Role } from '../types';

/** The part of `staff:read` before the colon; a key without a colon has no prefix. */
export function prefixOf(key: string): string {
  const colon = key.indexOf(':');
  return colon < 0 ? '' : key.slice(0, colon);
}

/** The part of `staff:read` after the colon, or the whole key when there is none. */
export function actionOf(key: string): string {
  const colon = key.indexOf(':');
  return colon < 0 ? key : key.slice(colon + 1);
}

/** "credit_limit" becomes "Credit limit". */
export function humanize(word: string): string {
  const spaced = word.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Accepts the permissions list in either shape the server may send (plain keys, or objects with an optional label
 * and group) and gives one shape: key, a readable label (the action, humanised) and the group (the prefix).
 * Blank and repeated keys are dropped; the server's order is kept.
 */
export function normalisePermissions(answer: PermissionsAnswer | null | undefined): Permission[] {
  const seen = new Set<string>();
  const permissions: Permission[] = [];
  for (const item of answer ?? []) {
    const given = typeof item === 'string' ? undefined : item;
    const key = (typeof item === 'string' ? item : item?.key)?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    permissions.push({
      key,
      label: given?.label?.trim() || humanize(actionOf(key)),
      group: given?.group?.trim() || prefixOf(key),
    });
  }
  return permissions;
}

/** A group of permissions in the role dialog. */
export type PermissionGroup = { id: string; title: string; items: Permission[] };

/** Id of the group that holds selected entries the server's list does not know (wildcards, retired permissions). */
export const OTHER_GROUP = '(other)';

/**
 * Groups the permissions for the role dialog, A to Z by group title. Entries already on the role that are not in
 * the catalog (for example `orders:*`) go in a last group of their own, so editing a role never silently drops them.
 */
export function groupPermissions(
  catalog: readonly Permission[],
  selected: readonly string[],
): PermissionGroup[] {
  const byGroup = new Map<string, Permission[]>();
  for (const permission of catalog) {
    byGroup.set(permission.group, [...(byGroup.get(permission.group) ?? []), permission]);
  }
  const groups = [...byGroup.entries()]
    .map(([id, items]) => ({ id, title: humanize(id) || 'General', items }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const known = new Set(catalog.map((permission) => permission.key));
  // The wildcard `*` has its own switch in the dialog, so it is not listed here.
  const extra = [...new Set(selected)].filter((key) => key !== '*' && !known.has(key));
  if (extra.length > 0) {
    const items = extra.map((key) => ({ key, label: key, group: OTHER_GROUP }));
    groups.push({ id: OTHER_GROUP, title: 'Other entries', items });
  }
  return groups;
}

/** One screen of the summary: a demo "area" and the API permission prefixes behind it. */
export type RoleArea = { name: string; full: string; prefixes: readonly string[] };

/**
 * The demo's eight areas (ROLE_AREAS), each with the permission prefixes of the map that belong to it, plus System
 * (health, alerts, incidents), which the demo does not have (MISMATCHES).
 */
export const ROLE_AREAS: readonly RoleArea[] = [
  { name: 'Orders', full: 'Orders and the review queue', prefixes: ['orders', 'inventory', 'files'] },
  {
    name: 'Customers',
    full: 'Customers and merchants',
    prefixes: ['customers', 'clients', 'wallet', 'groups', 'kyc', 'api_keys', 'growth'],
  },
  { name: 'Support', full: 'Tickets and replies', prefixes: ['support'] },
  { name: 'Risk', full: 'Risk and checks', prefixes: ['risk'] },
  {
    name: 'Money',
    full: 'Finance, commissions, refunds and disputes',
    prefixes: ['ledger', 'payments', 'invoices', 'commissions', 'refunds', 'disputes', 'reports'],
  },
  {
    name: 'Catalog',
    full: 'Services, suppliers and the storefront',
    prefixes: ['catalog', 'pricing', 'suppliers', 'storefront', 'legal'],
  },
  {
    name: 'Settings',
    full: 'System settings',
    prefixes: ['settings', 'tax', 'currencies', 'webhooks', 'notifications'],
  },
  {
    name: 'Admins',
    full: 'Admin accounts and access rules',
    prefixes: ['staff', 'access', 'roles', 'sessions', 'audit', 'queues'],
  },
  {
    name: 'System',
    full: 'System health, alerts and incidents',
    prefixes: ['system', 'alerts', 'incidents'],
  },
];

/** The area a prefix belongs to, or undefined (for example `dashboard`). */
export function areaOf(prefix: string): RoleArea | undefined {
  return ROLE_AREAS.find((area) => area.prefixes.includes(prefix));
}

/** What a role can do in one area: everything, only look, some of it, or nothing. */
export type AreaLevel = 'full' | 'view' | 'partial' | 'none';

/**
 * The level of a role in an area, from the catalog's permissions of that area: all of them is `full`; only
 * read permissions is `view`; any other mix is `partial`. A role with `*` is `full` everywhere.
 */
export function areaLevel(
  role: Pick<Role, 'permissions'>,
  area: RoleArea,
  catalog: readonly Permission[],
): AreaLevel {
  if (role.permissions.includes('*')) return 'full';
  const keys = catalog
    .map((permission) => permission.key)
    .filter((key) => area.prefixes.includes(prefixOf(key)));
  const granted = keys.filter((key) => hasPermission(role.permissions, key));
  if (granted.length === 0) return 'none';
  if (granted.length === keys.length) return 'full';
  return granted.every((key) => actionOf(key) === 'read') ? 'view' : 'partial';
}

/**
 * The names of the areas a role touches, in the order its permissions list them ("Orders", "Support"). The wildcard
 * `*` names no area: it covers all of them.
 */
export function areaNames(role: Pick<Role, 'permissions'>): string[] {
  const names = new Set<string>();
  for (const key of role.permissions) {
    if (key === '*') continue;
    const prefix = prefixOf(key);
    names.add(areaOf(prefix)?.name ?? (humanize(prefix) || 'Other'));
  }
  return [...names];
}

/** One sentence under the role field of the staff dialogs: what the chosen role covers. */
export function describeRole(role: Pick<Role, 'permissions'>): string {
  const permissions = role.permissions;
  if (permissions.includes('*')) return 'Everything, including who else is an admin and who may connect.';
  if (permissions.length === 0) return 'No permissions yet.';
  const count = `${permissions.length} ${permissions.length === 1 ? 'permission' : 'permissions'}`;
  return `${count} across ${areaNames(role).join(', ')}.`;
}

/** Whether two permission lists hold the same entries, in any order. */
export function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((key) => right.has(key));
}

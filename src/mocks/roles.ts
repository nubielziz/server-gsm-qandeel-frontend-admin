// The demo's roles and what each may do, from ADMIN_ROLES, ROLE_AREAS and ROLE_MATRIX in 14-state-access.js,
// written as the API's permission strings, plus the catalog of every permission and the editable role records.
// Mock data only: the real roles come from `GET /admin/roles` and the catalog from `GET /admin/permissions`.
import { Collection } from './db';

export type RoleKey = 'owner' | 'admin' | 'finance' | 'support' | 'risk' | 'viewer';

export const ROLES: { key: RoleKey; id: number; name: string }[] = [
  { key: 'owner', id: 1, name: 'Owner' },
  { key: 'admin', id: 2, name: 'Admin' },
  { key: 'finance', id: 3, name: 'Finance' },
  { key: 'support', id: 4, name: 'Support' },
  { key: 'risk', id: 5, name: 'Risk reviewer' },
  { key: 'viewer', id: 6, name: 'Read only' },
];

// Access level per demo area, in the order of ROLE_AREAS: 0 none, 1 view, 2 manage.
const ROLE_MATRIX: Record<RoleKey, number[]> = {
  owner: [2, 2, 2, 2, 2, 2, 2, 2],
  admin: [2, 2, 2, 2, 2, 2, 2, 1],
  finance: [1, 1, 0, 1, 2, 1, 0, 0],
  support: [1, 2, 2, 1, 0, 1, 0, 0],
  risk: [1, 1, 1, 2, 1, 0, 0, 0],
  viewer: [1, 1, 1, 1, 1, 1, 0, 0],
};

// The API permission areas (the part before the colon) behind each demo area, in the same order:
// Orders, Customers, Support, Risk, Money, Catalog, Settings, Admins.
const AREA_PERMISSIONS: string[][] = [
  ['orders', 'inventory', 'files'],
  ['customers', 'clients', 'wallet', 'groups', 'kyc', 'api_keys', 'growth'],
  ['support'],
  ['risk'],
  ['ledger', 'payments', 'invoices', 'commissions', 'refunds', 'disputes', 'reports'],
  ['catalog', 'pricing', 'suppliers', 'storefront', 'legal'],
  ['settings', 'tax', 'currencies', 'webhooks', 'notifications'],
  ['staff', 'access', 'roles', 'sessions', 'audit', 'queues'],
];

// Every permission of the map, by prefix, written out from docs/route-manifest.json (a CRUD row `x:*` stands for
// `x:read`, `x:create`, `x:update`, `x:delete` where the route exists).
const CATALOG: Record<string, string> = {
  staff: 'read create update suspend',
  access: 'read create update delete',
  roles: 'read create update delete',
  sessions: 'read revoke',
  audit: 'read',
  settings: 'read update storefront',
  clients: 'read create update',
  wallet: 'read adjust credit_limit',
  ledger: 'read reconcile',
  api_keys: 'read revoke',
  groups: 'read create update delete',
  catalog: 'read create update delete',
  pricing: 'read create update delete',
  orders: 'read update reopen',
  inventory: 'read write',
  files: 'read',
  suppliers: 'read create update delete',
  payments: 'read approve gateways',
  invoices: 'read create',
  kyc: 'read decide',
  commissions: 'read create update delete approve',
  reports: 'read finance growth',
  dashboard: 'read',
  queues: 'read',
  webhooks: 'read update',
  notifications: 'read create update delete',
  customers: 'read create update block password privacy suspend',
  tax: 'read create update',
  currencies: 'update',
  storefront: 'read create update publish',
  legal: 'read create publish',
  refunds: 'read approve',
  disputes: 'read manage',
  support: 'read create update delete reply',
  risk: 'read create delete decide',
  growth: 'read send',
};

/** `GET /admin/permissions` answers with this list. */
export const PERMISSION_CATALOG: string[] = Object.entries(CATALOG).flatMap(([prefix, actions]) =>
  actions.split(' ').map((action) => `${prefix}:${action}`),
);

/** The role record for a demo role key; an unknown key gets the read-only role. */
export function roleOf(key: string): { id: number; name: string; key: RoleKey } {
  return ROLES.find((role) => role.key === key) ?? ROLES[ROLES.length - 1];
}

/** Permission strings for a role: the owner has `*`, others get `area:*` (manage) or `area:read` (view) per area. */
export function permissionsOf(key: string): string[] {
  const role = roleOf(key).key;
  if (role === 'owner') return ['*'];
  const granted = new Set<string>(['dashboard:read']);
  ROLE_MATRIX[role].forEach((level, area) => {
    for (const permissionArea of AREA_PERMISSIONS[area]) {
      if (level === 2) granted.add(`${permissionArea}:*`);
      else if (level === 1) granted.add(`${permissionArea}:read`);
    }
  });
  return [...granted];
}

/** A role as the mock keeps it. */
export type MockRole = { id: number; name: string; permissions: string[] };

let store: Collection<MockRole> | undefined;

/** The role records (the demo's six roles to start with). The sign-in mock reads them for `me`, so edits apply there too. */
export function roleStore(): Collection<MockRole> {
  store ??= new Collection(ROLES.map(({ id, name, key }) => ({ id, name, permissions: permissionsOf(key) })));
  return store;
}

/** Drops the records so the next use re-seeds them (tests). */
export function resetRoleStore(): void {
  store = undefined;
}

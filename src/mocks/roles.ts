// The demo's roles and what each may do, from ADMIN_ROLES, ROLE_AREAS and ROLE_MATRIX in 14-state-access.js,
// written as the API's permission strings. Mock data only: the real roles come from `GET /admin/roles`.

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

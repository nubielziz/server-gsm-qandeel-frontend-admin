// Permission matching for the access-control provider and permission-aware UI (decision 006, MISMATCHES M7).
// Permissions are `area:action` strings; `area:*` grants every action of the area and `*` grants everything.
// This only decides what to show: the server enforces permissions on every request.

/** True when a granted permission covers a required one: `x:y` matches `x:y`, `x:*`, `*:*` and `*`. */
function covers(granted: string, required: string): boolean {
  if (granted === '*' || granted === '*:*' || granted === required) return true;
  return granted.endsWith(':*') && required.startsWith(granted.slice(0, -1));
}

/**
 * Whether the granted permissions allow `required`. An array means "any of these".
 * A required `x:*` (the whole area) needs `x:*` or `*` itself; `x:read` alone does not cover it.
 */
export function hasPermission(granted: readonly string[], required: string | readonly string[]): boolean {
  const needed = typeof required === 'string' ? [required] : required;
  return needed.some((permission) => granted.some((g) => covers(g, permission)));
}

/** The CRUD operations Refine reports for a resource row. */
export type CrudOp = 'list' | 'show' | 'create' | 'edit' | 'update' | 'delete';

const CRUD_ACTION: Record<CrudOp, string> = {
  list: 'read',
  show: 'read',
  create: 'create',
  edit: 'update',
  update: 'update',
  delete: 'delete',
};

/**
 * The permission one CRUD operation needs. A row marked `x:*` stands for all four operations
 * (`x:read`, `x:create`, `x:update`, `x:delete`); a specific permission such as `orders:read` stays as it is.
 * An operation we do not know keeps `x:*`, the strictest reading.
 */
export function crudPermission(rowPermission: string, op: string): string {
  if (!rowPermission.endsWith(':*')) return rowPermission;
  const action = Object.hasOwn(CRUD_ACTION, op) ? CRUD_ACTION[op as CrudOp] : undefined;
  return action ? `${rowPermission.slice(0, -1)}${action}` : rowPermission;
}

// Mock staff accounts, taken from the demo's admins. The sign-in mock reads them, and the access feature's mock
// handlers serve the same collection, so staff added there can sign in too.
import { Collection } from './db';
import { roleOf, type RoleKey } from './roles';
import { demoNumericId, demoRows, loadDemoState, toIso, type DemoState } from './seed';

/** An admin of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoAdmin = {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  status: 'invited' | 'active' | 'suspended';
  twofa: boolean;
  mustChangePw: boolean;
  lastLogin: number | null;
  lastIp: string | null;
  createdAt: number;
  createdBy: string;
  pwChangedAt: number | null;
  resetSentAt: number | null;
  suspendedAt: number | null;
  suspendedReason: string;
};

/** A staff account as the mock keeps it (API-style names, role by id). Sessions live in the session store. */
export type MockStaff = {
  id: number;
  email: string;
  name: string;
  status: 'invited' | 'active' | 'suspended';
  roleId: number;
  twofaEnabled: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  /** When the latest invitation or reset link went out. */
  resetSentAt: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  createdBy: number | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedBy: number | null;
};

const iso = (ms: number | null): string | null => (ms ? toIso(ms) : null);

/** Demo admin names to their numeric ids, so "created by Rami K." becomes a staff id. */
export function demoStaffIds(state: DemoState): Map<string, number> {
  return new Map(demoRows<DemoAdmin>(state, 'admins').map((admin) => [admin.name, demoNumericId(admin.id)]));
}

/** Maps a demo admin to the mock's API-style staff record. */
function fromDemo(admin: DemoAdmin, ids: Map<string, number>): MockStaff {
  const createdBy = ids.get(admin.createdBy) ?? null;
  return {
    id: demoNumericId(admin.id),
    email: admin.email,
    name: admin.name,
    status: admin.status,
    roleId: roleOf(admin.role).id,
    twofaEnabled: admin.twofa,
    mustChangePassword: admin.mustChangePw,
    passwordChangedAt: iso(admin.pwChangedAt),
    resetSentAt: iso(admin.resetSentAt),
    lastLoginAt: iso(admin.lastLogin),
    lastLoginIp: admin.lastIp,
    createdAt: toIso(admin.createdAt),
    createdBy,
    suspendedAt: iso(admin.suspendedAt),
    suspendedReason: admin.suspendedReason || null,
    // The demo does not record who suspended; the person who added the account stands in.
    suspendedBy: admin.status === 'suspended' ? createdBy : null,
  };
}

let store: Promise<Collection<MockStaff>> | undefined;

/** The staff collection, seeded from the demo on first use. */
export function staffStore(): Promise<Collection<MockStaff>> {
  store ??= loadDemoState().then((state) => {
    const ids = demoStaffIds(state);
    return new Collection(demoRows<DemoAdmin>(state, 'admins').map((admin) => fromDemo(admin, ids)));
  });
  return store;
}

/** Drops the collection so the next use re-seeds it (tests). */
export function resetStaffStore(): void {
  store = undefined;
}

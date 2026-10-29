// Mock staff accounts, taken from the demo's admins. The sign-in mock reads them, and the access feature's
// mock handlers can serve the same collection so created staff can sign in too.
import { Collection } from './db';
import type { RoleKey } from './roles';
import { demoNumericId, demoRows, loadDemoState, toIso } from './seed';

/** An admin of the demo seed, as the demo stores it. */
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
};

/** A staff account as the mock keeps it (API-style names, role by key). */
export type MockStaff = {
  id: number;
  email: string;
  name: string;
  status: 'invited' | 'active' | 'suspended';
  role: RoleKey;
  twofaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
};

/** Maps a demo admin to the mock's API-style staff record. */
function fromDemo(admin: DemoAdmin): MockStaff {
  return {
    id: demoNumericId(admin.id),
    email: admin.email,
    name: admin.name,
    status: admin.status,
    role: admin.role,
    twofaEnabled: admin.twofa,
    mustChangePassword: admin.mustChangePw,
    lastLoginAt: admin.lastLogin ? toIso(admin.lastLogin) : null,
    lastLoginIp: admin.lastIp,
  };
}

let store: Promise<Collection<MockStaff>> | undefined;

/** The staff collection, seeded from the demo on first use. */
export function staffStore(): Promise<Collection<MockStaff>> {
  store ??= loadDemoState().then(
    (state) => new Collection(demoRows<DemoAdmin>(state, 'admins').map(fromDemo)),
  );
  return store;
}

/** Drops the collection so the next use re-seeds it (tests). */
export function resetStaffStore(): void {
  store = undefined;
}

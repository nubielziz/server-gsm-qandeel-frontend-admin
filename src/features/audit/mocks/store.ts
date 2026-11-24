// The audit log mock store, built from the demo seed (`S.audit`, 42 entries) and mapped to the API's `AuditLog`: the person
// becomes an actor id and name (the system has no id), the demo's `diff` list becomes the `before` and `after` snapshots,
// and the record type and id are the API's. Built on first use and kept for the life of the page (or the test).
import { Collection } from '@/mocks/db';
import { demoRows, loadDemoState, toIso, type DemoState } from '@/mocks/seed';
import { accountIdOfLegacy } from '@/mocks/seed/accountIds';
import type { AuditLog } from '../types';

/** One entry of the demo seed, as the demo stores it. */
type DemoAudit = {
  id: string;
  ts: number;
  actor: string;
  verb: string;
  type: string;
  eid: string;
  label: string;
  diff: { field: string; from: string; to: string }[];
  ip: string | null;
};

type DemoAdmin = { id: string; name: string };

// The demo's `admin` (a staff login) and `access` (an IP rule) are `staff` and `ip_rule` in the API's words. Its `merchant` and
// `customer` entries are history from before the accounts were merged, so they keep their old words (rows are never rewritten) and
// the server's `account: { id }` names the account of each: a merchant keeps its number, customer `cN` became account `100 + N`.
const ENTITY_TYPE: Record<string, string> = { admin: 'staff', access: 'ip_rule' };

// The number at the end of a demo id ("ORD-48792", "sup2"), or 0 for a record the demo names without one ("sess", "fx").
const numberOf = (id: string): number => {
  const match = /(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
};

// The account an old `merchant` or `customer` entry is about, as the server resolves it; other entries are about no account.
function accountOf(type: string, recordId: number): AuditLog['account'] {
  if (type !== 'merchant' && type !== 'customer') return undefined;
  return recordId > 0 ? { id: accountIdOfLegacy(type, recordId) } : null;
}

// A field that had no value before has no key in `before`, and one with none after has no key in `after`.
function snapshots(diff: DemoAudit['diff']): Pick<AuditLog, 'before' | 'after'> {
  const real = diff.filter((line) => line.field);
  if (real.length === 0) return { before: null, after: null };
  const before: Record<string, string> = {};
  const after: Record<string, string> = {};
  for (const line of real) {
    if (line.from !== '') before[line.field] = line.from;
    if (line.to !== '') after[line.field] = line.to;
  }
  return { before, after };
}

function fromDemo(entry: DemoAudit, staffIds: Map<string, number>): AuditLog {
  const system = entry.actor === 'System';
  const entityId = numberOf(entry.eid);
  const account = accountOf(entry.type, entityId);
  return {
    id: numberOf(entry.id),
    actorType: system ? 'system' : 'staff',
    actorId: system ? null : (staffIds.get(entry.actor) ?? null),
    actorName: entry.actor,
    action: entry.verb,
    entityType: ENTITY_TYPE[entry.type] ?? entry.type,
    entityId,
    entityLabel: entry.label,
    ...(account !== undefined ? { account } : {}),
    ...snapshots(entry.diff),
    ip: entry.ip,
    // The demo's timestamps carry fractions of a millisecond.
    createdAt: toIso(Math.floor(entry.ts)),
  };
}

function build(demo: DemoState): Collection<AuditLog> {
  const staffIds = new Map(
    demoRows<DemoAdmin>(demo, 'admins').map((admin) => [admin.name, numberOf(admin.id)]),
  );
  return new Collection(demoRows<DemoAudit>(demo, 'audit').map((entry) => fromDemo(entry, staffIds)));
}

let state: Promise<Collection<AuditLog>> | undefined;

/** The audit entries the mock routes read. The log is append-only, so nothing here changes them. */
export function auditState(): Promise<Collection<AuditLog>> {
  state ??= loadDemoState().then(build);
  return state;
}

/** Drops the entries so the next use re-seeds them (tests call this after each test). */
export function resetAuditState(): void {
  state = undefined;
}

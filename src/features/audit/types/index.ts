// Types for the audit feature (`/audit`): one entry of the audit log and the filters the list takes. The map gives the
// table `audit_logs` but no bodies (MISMATCHES M10), so the joined names and the filters are assumed contracts. The shape is built
// from `AuditLogRow` in `src/lib/api/schema.gen.ts`.
import type { Id, JsonValue } from '@/lib/api';
import type { AuditLogRow } from '@/lib/api/schema.gen';

/** The two kinds of actor the console filters by: a staff member, or the system itself (a sync, a scheduled job). */
export type AuditActorType = 'staff' | 'system';

/**
 * One audit entry, as `GET /admin/audit-logs` and `GET /admin/audit-logs/:id` send it (assumed contract). The row's
 * `action` is the readable phrase the demo shows ("changed price of"). The server joins `actorName` and `entityLabel`
 * (the name of the record at the time of the change, so a deleted record still reads well); without them the screen
 * falls back to "Staff #3" and "Order #4812". `actorId` is null for the
 * system and `ip` is null for a change nobody made from a browser. The list may leave out `before` and `after` to keep
 * the page small; the screen then asks `GET /admin/audit-logs/:id` when someone opens the entry.
 */
export type AuditLog = Omit<
  AuditLogRow,
  'actorType' | 'actorId' | 'before' | 'after' | 'ip' | 'updatedAt'
> & {
  /** Normally an `AuditActorType`; any other value is treated like a person. */
  actorType: string;
  actorId: Id | null;
  actorName?: string | null;
  entityLabel?: string | null;
  before?: JsonValue;
  after?: JsonValue;
  ip: string | null;
};

/**
 * The filters of `GET /admin/audit-logs` (assumed contract), on top of the list query's `q`, range and sort:
 * `actorType` and `actorId` pick a person or the system, `entityType` one kind of record, `from` and `to` a
 * range of days (`YYYY-MM-DD`, both included).
 */
export type AuditFilters = {
  actorType?: string;
  actorId?: Id;
  entityType?: string;
  q?: string;
  from?: string;
  to?: string;
};

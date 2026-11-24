// Types for the audit feature (`/audit`): one entry of the audit log and the filters the list takes. The map gives the
// table `audit_logs` but no bodies (MISMATCHES M10), so the joined names and the filters are assumed contracts. The shape is built
// from `AuditLogRow` in `src/lib/api/schema.gen.ts`.
import type { Id, JsonValue } from '@/lib/api';
import type { AuditLogRow } from '@/lib/api/schema.gen';

/**
 * The kinds of actor an entry names. The console filters by a staff member or the system itself (a sync, a scheduled job); an
 * account is the actor of what it did on its own (new rows say `account`). Old rows keep the words of the old model: `client`
 * (a merchant, whose number is an account number) and `customer` (an old customer number, not an account number).
 */
export type AuditActorType = 'staff' | 'account' | 'client' | 'customer' | 'system';

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
  /**
   * The account the entry is about, resolved by the server (`account` rows, `merchant` rows and old `customer` rows through the
   * legacy map): the link of an "Open record" goes through it. Null or absent when the server could not name one.
   */
  account?: { id: Id } | null;
  before?: JsonValue;
  after?: JsonValue;
  ip: string | null;
};

/**
 * The filters of `GET /admin/audit-logs` (assumed contract), on top of the list query's `q`, range and sort:
 * `actorType` and `actorId` pick a person or the system, `entityType` one kind of record (with `entityId`, one record of
 * that kind), `from` and `to` a range of days (`YYYY-MM-DD`, both included). `accountId` lists everything about one account:
 * the rows that say `account` or `merchant` with its number and the old `customer` rows of its old number (the server joins
 * them); it replaces `entityType` and `entityId` for an account.
 */
export type AuditFilters = {
  actorType?: string;
  actorId?: Id;
  entityType?: string;
  entityId?: Id;
  accountId?: Id;
  q?: string;
  from?: string;
  to?: string;
};

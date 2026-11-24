// The Audit log page's filters as URL search parameters (`?actor=2&type=order&q=price&from=2026-03-01`), so a link or a
// reload shows the same list (ARCHITECTURE §5.2). Ports the `ui.audit` state (q, actor, type) of 47-p-audit.js, which lived
// in memory, and adds the date range. Nothing here decides which entries match: it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { AuditFilters } from '../types';
import { entityKind, isOldCustomerWord } from './entities';

/**
 * The toolbar. `actor` is empty (everyone), `system`, or a staff id; `type` is a record type; `record` is the id of one record of
 * that type (a link from an account's page), empty for all; `from` / `to` are days.
 */
export type AuditView = { q: string; actor: string; type: string; record: string; from: string; to: string };

/** The actor value that means the system rather than a person. */
export const SYSTEM_ACTOR = 'system';

/** Entries asked for at a time. The demo drew 60 at once from memory; the console asks the server for a smaller page. */
export const AUDIT_PAGE_SIZE = 25;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A staff id or "system"; anything else (a typo in a link) means everyone. */
export function parseActor(raw: string | null): string {
  return raw === SYSTEM_ACTOR || (raw !== null && /^\d+$/.test(raw)) ? raw : '';
}

/** The one record type of an account: `merchant`, `client` and `customer` are old words for it. */
export const ACCOUNT_TYPE = 'account';

/**
 * A record type from the address. Every word of an account (an old bookmark that says `merchant` or `client`) becomes `account`,
 * because the filter "Account" lists the old rows together with the new ones.
 */
export function parseType(raw: string | null): string {
  const type = raw?.trim() ?? '';
  return type && entityKind(type) === ACCOUNT_TYPE ? ACCOUNT_TYPE : type;
}

/** A record id: digits only; anything else (a typo in a link) means every record. */
export function parseRecord(raw: string | null): string {
  return raw !== null && /^\d+$/.test(raw) ? raw : '';
}

export function parseView(params: URLSearchParams): AuditView {
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const rawType = params.get('type');
  return {
    q: params.get('q') ?? '',
    actor: parseActor(params.get('actor')),
    type: parseType(rawType),
    // A number of the old customer record is not an account number, so a link that carries one keeps no record.
    record: isOldCustomerWord(rawType ?? '') ? '' : parseRecord(params.get('record')),
    from: DAY.test(from) ? from : '',
    to: DAY.test(to) ? to : '',
  };
}

/** True when any filter is on, which is when "Clear filters" shows. */
export function hasFilters(view: AuditView): boolean {
  return Boolean(view.q.trim() || view.actor || view.type || view.record || view.from || view.to);
}

/**
 * The API filters for the toolbar. A person is `actorType=staff` with `actorId`; the system is `actorType=system`; the record type
 * "Account" with a record is `accountId`.
 */
export function toFilters(view: AuditView): AuditFilters {
  const q = view.q.trim();
  return {
    ...(q ? { q } : {}),
    ...(view.actor === SYSTEM_ACTOR ? { actorType: 'system' } : {}),
    ...(view.actor && view.actor !== SYSTEM_ACTOR ? { actorType: 'staff', actorId: Number(view.actor) } : {}),
    // One account is asked for by its number: the server joins the rows of every word of it (`account`, `merchant` and the old
    // `customer` rows of its old number), which `entityType` with `entityId` cannot do.
    ...(view.type === ACCOUNT_TYPE && view.record ? { accountId: Number(view.record) } : {}),
    ...(view.type && !(view.type === ACCOUNT_TYPE && view.record) ? { entityType: view.type } : {}),
    // A record id means nothing without its type (ids of different kinds overlap), so it is sent only beside one.
    ...(view.type && view.type !== ACCOUNT_TYPE && view.record ? { entityId: Number(view.record) } : {}),
    ...(view.from ? { from: view.from } : {}),
    ...(view.to ? { to: view.to } : {}),
  };
}

/** The same filters as Refine's list filters, which the data provider turns into the query string (`q` becomes the search text). */
export function toRefineFilters(filters: AuditFilters): CrudFilters {
  return Object.entries(filters).flatMap(([field, value]) =>
    value === undefined || value === '' ? [] : [{ field, operator: 'eq' as const, value }],
  );
}

/** The address with some filters changed. Every other parameter (an open order's `order`) stays. */
export function writeView(base: URLSearchParams, patch: Partial<AuditView>): URLSearchParams {
  const merged = { ...parseView(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('q', merged.q);
  put('actor', merged.actor);
  put('type', merged.type);
  put('record', merged.record);
  put('from', merged.from);
  put('to', merged.to);
  return next;
}

/** The address with every filter removed. */
export function clearView(base: URLSearchParams): URLSearchParams {
  return writeView(base, { q: '', actor: '', type: '', record: '', from: '', to: '' });
}

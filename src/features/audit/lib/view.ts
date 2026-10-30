// The Audit log page's filters as URL search parameters (`?actor=2&type=order&q=price&from=2026-03-01`), so a link or a
// reload shows the same list (ARCHITECTURE §5.2). Ports the `ui.audit` state (q, actor, type) of 47-p-audit.js, which lived
// in memory, and adds the date range. Nothing here decides which entries match: it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { AuditFilters } from '../types';

/** The toolbar. `actor` is empty (everyone), `system`, or a staff id; `type` is a record type; `from` / `to` are days. */
export type AuditView = { q: string; actor: string; type: string; from: string; to: string };

/** The actor value that means the system rather than a person. */
export const SYSTEM_ACTOR = 'system';

/** Entries asked for at a time. The demo drew 60 at once from memory; the console asks the server for a smaller page. */
export const AUDIT_PAGE_SIZE = 25;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A staff id or "system"; anything else (a typo in a link) means everyone. */
export function parseActor(raw: string | null): string {
  return raw === SYSTEM_ACTOR || (raw !== null && /^\d+$/.test(raw)) ? raw : '';
}

export function parseView(params: URLSearchParams): AuditView {
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  return {
    q: params.get('q') ?? '',
    actor: parseActor(params.get('actor')),
    type: params.get('type')?.trim() ?? '',
    from: DAY.test(from) ? from : '',
    to: DAY.test(to) ? to : '',
  };
}

/** True when any filter is on, which is when "Clear filters" shows. */
export function hasFilters(view: AuditView): boolean {
  return Boolean(view.q.trim() || view.actor || view.type || view.from || view.to);
}

/** The API filters for the toolbar. A person is `actorType=staff` with `actorId`; the system is `actorType=system`. */
export function toFilters(view: AuditView): AuditFilters {
  const q = view.q.trim();
  return {
    ...(q ? { q } : {}),
    ...(view.actor === SYSTEM_ACTOR ? { actorType: 'system' } : {}),
    ...(view.actor && view.actor !== SYSTEM_ACTOR ? { actorType: 'staff', actorId: Number(view.actor) } : {}),
    ...(view.type ? { entityType: view.type } : {}),
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
  put('from', merged.from);
  put('to', merged.to);
  return next;
}

/** The address with every filter removed. */
export function clearView(base: URLSearchParams): URLSearchParams {
  return writeView(base, { q: '', actor: '', type: '', from: '', to: '' });
}

// Mock of `GET /admin/audit-logs` and `GET /admin/audit-logs/:id`: the list filters (person, record type, search, days), sorts and
// pages like the real one and answers `x-total-count`; the single entry answers 404 for an id nobody has. Entries cannot be
// changed, so there are no other routes. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { notFound } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { guard } from '@/mocks/session';
import type { AuditLog } from '../types';
import { auditState } from './store';

// What the free-text `q` looks in: the person, the action and the record's name.
const SEARCH_FIELDS = ['actorName', 'action', 'entityLabel'];

const DAY_MS = 86_400_000;

// `from` and `to` are whole days (UTC here), both included. The generic list handles every other filter.
function inDays(rows: AuditLog[], params: URLSearchParams): AuditLog[] {
  const from = params.get('from');
  const to = params.get('to');
  const start = from ? Date.parse(`${from}T00:00:00.000Z`) : Number.NEGATIVE_INFINITY;
  const end = to ? Date.parse(`${to}T00:00:00.000Z`) + DAY_MS : Number.POSITIVE_INFINITY;
  return rows.filter((row) => {
    const at = Date.parse(row.createdAt);
    return at >= start && at < end;
  });
}

export const auditHandlers: HttpHandler[] = [
  http.get('*/admin/audit-logs', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const params = new URL(request.url).searchParams;
    const generic = new URLSearchParams(params);
    generic.delete('from');
    generic.delete('to');
    const rows = inDays((await auditState()).list(), params);
    const { page, total } = applyListQuery(rows, generic, SEARCH_FIELDS);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  http.get('*/admin/audit-logs/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const entry = (await auditState()).find(String(params.id));
    return entry ? HttpResponse.json(entry) : notFound('audit entry', params.id);
  }),
];

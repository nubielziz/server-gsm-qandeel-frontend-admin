// Mock routes of the supplier API log (`GET /admin/supplier-api-logs`, `…/:id`) and of the supplier report (`GET
// /admin/reports/suppliers`). In the dev app a new call is added while someone watches the list, so the live log has
// something to show (the demo did it with a timer); tests stay still unless they add a call themselves.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { notFound } from '@/mocks/handlers/accessShared';
import { orderStore } from '@/mocks/orders';
import { toMoney } from '@/mocks/seed';
import type { SuppliersState } from './seed';
import { secured } from './secured';
import { addCall } from './store';

const DAY = 86_400_000;
const LIVE_EVERY_MS = 8000;
const lastLive = new Map<number, number>();

// Dev only: at most one made-up call per supplier every few seconds, shaped by the supplier's health.
function liveTick(data: SuppliersState, supplierId: number): void {
  if (import.meta.env.MODE === 'test') return;
  const row = data.suppliers.find(supplierId);
  const now = Date.now();
  if (!row || row.status === 'disabled' || now - (lastLive.get(supplierId) ?? 0) < LIVE_EVERY_MS) return;
  lastLive.set(supplierId, now);
  const roll = Math.random() * 100;
  const code =
    row.health === 'down'
      ? 503
      : row.health === 'degraded'
        ? roll < 56
          ? 200
          : roll < 86
            ? 504
            : 429
        : roll < 96
          ? 200
          : 429;
  const action = ['placeimeiorder', 'getimeiorder', 'getimeiorder', 'accountinfo'][
    Math.floor(Math.random() * 4)
  ];
  const message =
    code === 504 ? 'Gateway timeout' : code === 429 ? 'Rate limited, retry after 5s' : 'Service unavailable';
  addCall(data, {
    supplierId,
    action,
    code,
    ms: code === 200 ? Math.round((row.p50Ms ?? 400) * (0.6 + Math.random())) : 8500,
    message,
  });
}

/** Forgets when a call was last added (tests). */
export function resetLiveLog(): void {
  lastLive.clear();
}

/** The routes for the API log and the supplier report. */
export const logHandlers: HttpHandler[] = [
  http.get(
    '*/admin/supplier-api-logs/:id',
    secured(({ params, data }) => {
      const log = data.logs.find(String(params.id));
      return log ? HttpResponse.json(log) : notFound('API call', params.id);
    }),
  ),

  http.get(
    '*/admin/supplier-api-logs',
    secured(({ request, data }) => {
      const params = new URL(request.url).searchParams;
      const supplierId = Number(params.get('supplierId'));
      if (supplierId) liveTick(data, supplierId);
      // The list leaves out the big request and response bodies.
      const rows = data.logs.list().map(({ request: _request, response: _response, ...log }) => log);
      const { page, total } = applyListQuery(rows, params, ['action', 'error']);
      return HttpResponse.json(page, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  ),

  http.get(
    '*/admin/reports/suppliers',
    secured(async ({ request, data }) => {
      const days = Number(new URL(request.url).searchParams.get('days')) || 7;
      const since = Date.now() - days * DAY;
      const orders = (await orderStore())
        .list()
        .filter((order) => order.supplier && Date.parse(order.createdAt) >= since);
      const rows = data.suppliers.list().map((supplier) => {
        const mine = orders.filter((order) => order.supplier?.id === supplier.id);
        const completed = mine.filter((order) => order.status === 'completed');
        const rejected = mine.filter((order) => order.status === 'rejected');
        const finished = completed.length + rejected.length;
        const seconds = completed.flatMap((order) =>
          order.completedAt
            ? [(Date.parse(order.completedAt) - Date.parse(order.sentAt ?? order.createdAt)) / 1000]
            : [],
        );
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          orders: mine.length,
          completed: completed.length,
          rejected: rejected.length,
          spend: toMoney(completed.reduce((total, order) => total + Number(order.totalCost), 0)),
          rejectionRate: finished > 0 ? (rejected.length / finished) * 100 : null,
          averageSeconds:
            seconds.length > 0 ? seconds.reduce((total, value) => total + value, 0) / seconds.length : null,
        };
      });
      return HttpResponse.json(rows);
    }),
  ),
];

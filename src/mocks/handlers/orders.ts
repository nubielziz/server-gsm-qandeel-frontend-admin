// Mock of the order read routes (`/admin/orders`, `/admin/orders/:id`, its events, `/export`, `/bulk-reply/*`, `/admin/files/:id`): list
// with the tab and toolbar filters, one order, its timeline, the CSV export and the bulk reply. The actions are in
// `ordersActionRoutes.ts`. Special routes come before `/:id`, which would otherwise answer `/export`.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { BulkReplyLine, BulkReplyLineStatus } from '@/features/orders';
import { applyListQuery } from '../crud';
import { latency } from '../latency';
import { orderStore, toOrder, type MockOrder } from '../orders';
import { completeMock } from '../ordersActions';
import { guard } from '../session';
import { bodyOf, invalid, notFound, textOf } from './accessShared';
import { actorOf, isOpen } from './ordersShared';
import { orderActionHandlers } from './ordersActionRoutes';

const SEARCH_FIELDS = ['id', 'imei', 'supplierRef', 'client.name', 'customer.name', 'service.name'];
const REVIEW_QUEUES = new Set(['manual', 'needs_attention', 'verification', 'review']);

// The server's call on "past SLA" (open, not waiting for a person, older than the service's target); the mock uses the same sum.
function isPastSla(row: MockOrder, now: number): boolean {
  if (!isOpen(row) || (row.queue && REVIEW_QUEUES.has(row.queue))) return false;
  return now - Date.parse(row.createdAt) > row.service.slaMinutes * 60_000;
}

// A row with the extra fields the list filters name (`type`, `supplierId`, `clientId`, `customerId`, `pastSla`).
function filterable(row: MockOrder, now: number) {
  return {
    ...toOrder(row),
    type: row.service.type,
    supplierId: row.supplier?.id ?? null,
    clientId: row.client?.id ?? null,
    customerId: row.customer?.id ?? null,
    pastSla: isPastSla(row, now),
    row,
  };
}

async function matching(params: URLSearchParams) {
  const orders = await orderStore();
  const now = Date.now();
  return applyListQuery(
    orders.list().map((row) => filterable(row, now)),
    params,
    SEARCH_FIELDS,
  );
}

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Reads one pasted line: the input first, then the code (split on spaces, commas, semicolons or tabs).
function readLine(raw: string, line: number, open: MockOrder[], all: MockOrder[]): BulkReplyLine {
  const [imei, ...rest] = raw.trim().split(/[\s,;]+/);
  const code = rest.join(' ');
  const base = { line, raw, imei: imei || null, code: code || null, orderId: null };
  if (!imei || !code) return { ...base, status: 'invalid' };
  const same = (row: MockOrder) => row.imei.replace(/\s/g, '') === imei.replace(/\s/g, '');
  const candidates = all.filter(same);
  const live = open.filter(same);
  let status: BulkReplyLineStatus = 'matched';
  if (candidates.length === 0) status = 'not_found';
  else if (live.length === 0) status = 'not_open';
  else if (live.length > 1) status = 'ambiguous';
  return { ...base, orderId: status === 'matched' ? live[0].id : null, status };
}

export const ordersHandlers: HttpHandler[] = [
  http.get('*/admin/orders/export', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const params = new URL(request.url).searchParams;
    params.delete('_start');
    params.delete('_end');
    const { page } = await matching(params);
    const lines = page.map(({ row }) =>
      [
        row.id,
        row.createdAt,
        row.channel,
        row.client?.name ?? row.customer?.name,
        row.service.name,
        row.imei,
        row.status,
        row.supplier?.name,
        row.totalPrice,
        row.totalCost,
      ]
        .map(csvCell)
        .join(','),
    );
    return new HttpResponse(
      ['id,created,channel,buyer,service,input,status,supplier,price,cost', ...lines].join('\n'),
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="orders-export.csv"',
        },
      },
    );
  }),

  http.post('*/admin/orders/bulk-reply/preview', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const text = textOf((await bodyOf(request)).text);
    if (!text) return invalid([{ field: 'text', message: 'Paste at least one line.' }]);
    const all = (await orderStore()).list();
    const open = all.filter(isOpen);
    const lines = text
      .split('\n')
      .map((raw, index) => ({ raw, line: index + 1 }))
      .filter(({ raw }) => raw.trim() !== '')
      .map(({ raw, line }) => readLine(raw, line, open, all));
    return HttpResponse.json({ lines });
  }),

  http.post('*/admin/orders/bulk-reply/apply', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const orders = await orderStore();
    const actor = await actorOf();
    const items = ((await bodyOf(request)).items ?? []) as { orderId: number; code: string }[];
    let applied = 0;
    const failed: { orderId: number; title: string }[] = [];
    for (const item of items) {
      const order = orders.find(item.orderId);
      if (!order || !isOpen(order)) {
        failed.push({ orderId: item.orderId, title: 'The order is already closed.' });
        continue;
      }
      await completeMock(order, actor, item.code);
      applied += 1;
    }
    return HttpResponse.json({ applied, failed });
  }),

  http.get('*/admin/orders', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { page, total } = await matching(new URL(request.url).searchParams);
    return HttpResponse.json(
      page.map(({ row }) => toOrder(row)),
      { headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' } },
    );
  }),

  http.get('*/admin/orders/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const order = (await orderStore()).find(String(params.id));
    return order ? HttpResponse.json(toOrder(order)) : notFound('order', params.id);
  }),

  http.get('*/admin/orders/:id/events', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const order = (await orderStore()).find(String(params.id));
    return order ? HttpResponse.json(order.events) : notFound('order', params.id);
  }),

  ...orderActionHandlers,

  // A file result or input: the real server redirects to a signed link; the mock answers with a small text file.
  http.get('*/admin/files/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return new HttpResponse(`Mock file ${String(params.id)}`, { headers: { 'Content-Type': 'text/plain' } });
  }),
];

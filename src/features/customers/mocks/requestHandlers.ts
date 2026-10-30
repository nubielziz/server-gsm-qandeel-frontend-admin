// Mock of the data-request routes `GET /admin/data-requests`, `GET /admin/data-requests/:id` and
// `PATCH /admin/data-requests/:id`: the list with filters, sort and `x-total-count`, one request, and moving a request to in
// progress, done or rejected. A request that is already closed refuses a second change. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { toRequest } from './dto';
import { customerState } from './store';

const MOVES = new Set(['in_progress', 'completed', 'rejected']);

export const requestHandlers: HttpHandler[] = [
  http.get('*/admin/data-requests', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await customerState();
    const rows = state.requests.list().map((row) => toRequest(row, state));
    const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, ['customerName']);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  http.get('*/admin/data-requests/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await customerState();
    const row = state.requests.find(String(params.id));
    return row ? HttpResponse.json(toRequest(row, state)) : notFound('data request', params.id);
  }),

  http.patch('*/admin/data-requests/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await customerState();
    const row = state.requests.find(String(params.id));
    if (!row) return notFound('data request', params.id);
    const body = await bodyOf(request);
    const status = textOf(body.status);
    if (!MOVES.has(status))
      return invalid([{ field: 'status', message: 'Choose in progress, done or rejected.' }]);
    if (row.status === 'completed' || row.status === 'rejected') {
      return problem(
        409,
        'REQUEST_CLOSED',
        'Request already closed',
        'This request has already been closed.',
      );
    }
    state.requests.patch(row.id, {
      status: status as 'in_progress' | 'completed' | 'rejected',
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      handledBy: (await currentStaff())?.id ?? null,
    });
    return HttpResponse.json(toRequest(row, state));
  }),
];

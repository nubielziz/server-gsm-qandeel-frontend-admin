// Mock of the data-request routes `GET /admin/data-requests`, `GET /admin/data-requests/:id` and `PATCH /admin/data-requests/:id`: the list with
// filters, sort and `x-total-count`, one request, and moving a request to in progress, done or rejected. A request that is already closed
// refuses a second change, an erasure cannot be marked done by hand until its account is anonymized (409 `ERASURE_NOT_DONE`), and the old
// `customerId` filter is a 422 (the filter is `accountId`). Dev and tests only.
import { HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { problem } from '@/mocks/problem';
import { currentStaff } from '@/mocks/session';
import type { DataRequest } from '../types';
import { context } from './context';
import { bodyOf, idOf, invalid, notFound, route, textOf } from './shared';
import type { AccountState, MockRequest } from './types';

const MOVES = new Set(['in_progress', 'completed', 'rejected']);

/** A data request with the account's current name. */
function toRequest(row: MockRequest, state: AccountState): DataRequest {
  return { ...row, accountName: state.accounts.find(row.accountId)?.name ?? 'Unknown account' };
}

export const requestRoutes: HttpHandler[] = [
  route('get', '/admin/data-requests', async ({ request }) => {
    const { state } = await context();
    const params = new URL(request.url).searchParams;
    if (params.has('customerId')) {
      return invalid([{ field: 'customerId', message: 'Filter by accountId: customerId is retired.' }]);
    }
    const rows = state.requests.list().map((row) => toRequest(row, state));
    const { page, total } = applyListQuery(rows, params, ['accountName']);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  route('get', '/admin/data-requests/:id', async (call) => {
    const { state } = await context();
    const row = state.requests.find(idOf(call));
    return row ? HttpResponse.json(toRequest(row, state)) : notFound('data request', call.params.id);
  }),

  route('patch', '/admin/data-requests/:id', async (call) => {
    const { state } = await context();
    const row = state.requests.find(idOf(call));
    if (!row) return notFound('data request', call.params.id);
    const status = textOf((await bodyOf(call.request)).status);
    if (!MOVES.has(status)) {
      return invalid([{ field: 'status', message: 'Choose in progress, done or rejected.' }]);
    }
    if (row.status === 'completed' || row.status === 'rejected') {
      return problem(
        409,
        'REQUEST_CLOSED',
        'Request already closed',
        'This request has already been closed.',
      );
    }
    if (
      status === 'completed' &&
      row.kind === 'erasure' &&
      state.accounts.find(row.accountId)?.status !== 'anonymized'
    ) {
      return problem(
        409,
        'ERASURE_NOT_DONE',
        'Account not anonymized',
        'An erasure request is closed by anonymizing the account.',
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

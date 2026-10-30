// Mock of the account and privacy actions: `POST /admin/customers/:id/account|password|sessions/revoke|suspend|reactivate|block|anonymize` and
// `GET /admin/customers/:id/export`. State changes are simple; the only refusals are an action that does not fit the customer's state and
// missing input. Export and anonymise close the customer's open request of that kind, as the demo did. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { context, temporaryPassword, type Context } from './context';
import type { CustomerState, MockCustomer } from './types';
import type { DataRequestKind } from '../types';

type ActionResult = Response | Record<string, unknown> | void;

// `POST /admin/customers/:id/<suffix>`: finds the customer, runs the change, answers 204 or the returned object.
function customerAction(
  suffix: string,
  apply: (
    row: MockCustomer,
    ctx: Context,
    body: Record<string, unknown>,
  ) => ActionResult | Promise<ActionResult>,
): HttpHandler {
  return http.post(`*/admin/customers/:id/${suffix}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const ctx = await context();
    const row = ctx.state.customers.find(String(params.id));
    if (!row) return notFound('customer', params.id);
    if (row.status === 'anonymized') {
      return problem(
        409,
        'ANONYMIZED',
        'Customer removed',
        'This customer was anonymised. Nothing can change.',
      );
    }
    const result = await apply(row, ctx, await bodyOf(request));
    if (result instanceof Response) return result;
    return result ? HttpResponse.json(result) : new HttpResponse(null, { status: 204 });
  });
}

const notActive = () =>
  problem(409, 'NOT_ACTIVE', 'Not an active customer', 'Only an active customer can be suspended.');

// Closes the customer's open request of one kind, as the demo did when the data left or was erased.
async function closeRequest(state: CustomerState, customerId: number, kind: DataRequestKind): Promise<void> {
  const open = state.requests
    .list()
    .find(
      (request) =>
        request.customerId === customerId &&
        request.kind === kind &&
        (request.status === 'open' || request.status === 'in_progress'),
    );
  if (!open) return;
  state.requests.patch(open.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    handledBy: (await currentStaff())?.id ?? null,
  });
}

// A new account for a guest, or a new password for an account: a link, or a temporary password returned once.
function passwordFlags(mode: unknown): Partial<MockCustomer> | undefined {
  const now = new Date().toISOString();
  if (mode === 'temporary_password') {
    return { mustChangePassword: true, passwordChangedAt: now, resetSentAt: null };
  }
  return mode === 'reset_link' ? { resetSentAt: now } : undefined;
}

const noMode = () => invalid([{ field: 'mode', message: 'Choose how they get a password.' }]);

export const actionHandlers: HttpHandler[] = [
  http.get('*/admin/customers/:id/export', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { state, ordersOf } = await context();
    const row = state.customers.find(String(params.id));
    if (!row) return notFound('customer', params.id);
    const data = {
      customer: { id: row.id, name: row.name, email: row.email, country: row.country },
      orders: ordersOf(row.id).map((order) => ({
        id: order.id,
        service: order.service.name,
        imei: order.imei,
        status: order.status,
        total: order.totalPrice,
        created: order.createdAt,
      })),
    };
    await closeRequest(state, row.id, 'export');
    return new HttpResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="customer-${row.id}.json"`,
      },
    });
  }),

  // A guest gets an account; their earlier orders are linked to it by the server.
  customerAction('account', (row, { state }, body) => {
    if (row.hasAccount) {
      return problem(
        409,
        'ACCOUNT_EXISTS',
        'Already has an account',
        'This customer already has an account.',
      );
    }
    const flags = passwordFlags(body.mode);
    if (!flags) return noMode();
    state.customers.patch(row.id, { hasAccount: true, ...flags });
    return body.mode === 'temporary_password' ? { temporaryPassword: temporaryPassword() } : {};
  }),

  customerAction('password', (row, { state }, body) => {
    if (!row.hasAccount) {
      return problem(409, 'NO_ACCOUNT', 'No account', 'A guest has no password. Create an account first.');
    }
    const flags = passwordFlags(body.mode);
    if (!flags) return noMode();
    state.customers.patch(row.id, { ...flags, ...(body.revokeSessions ? { activeSessions: 0 } : {}) });
    return body.mode === 'temporary_password' ? { temporaryPassword: temporaryPassword() } : {};
  }),

  customerAction('sessions/revoke', (row, { state }) => {
    state.customers.patch(row.id, { activeSessions: 0 });
  }),

  customerAction('suspend', async (row, { state }, body) => {
    const reason = textOf(body.reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Choose a reason for the audit log.' }]);
    if (row.status !== 'active') return notActive();
    const note = textOf(body.note);
    state.customers.patch(row.id, {
      status: 'suspended',
      suspendedAt: new Date().toISOString(),
      suspendedReason: note ? `${reason}: ${note}` : reason,
      suspendedBy: (await currentStaff())?.id ?? null,
      activeSessions: 0,
    });
  }),

  customerAction('reactivate', (row, { state }) => {
    if (row.status !== 'suspended') {
      return problem(409, 'NOT_SUSPENDED', 'Not suspended', 'Only a suspended customer can be reactivated.');
    }
    state.customers.patch(row.id, {
      status: 'active',
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
    });
  }),

  // Blocking marks the customer high risk and keeps the reason as a note; lifting it drops a high risk to medium (the demo's rule).
  customerAction('block', (row, { state }, body) => {
    if (body.blocked === false) {
      if (row.status !== 'blocked') {
        return problem(409, 'NOT_BLOCKED', 'Not blocked', 'This customer is not blocked.');
      }
      state.customers.patch(row.id, {
        status: 'active',
        riskLevel: row.riskLevel === 'high' ? 'medium' : row.riskLevel,
      });
      return;
    }
    const reason = textOf(body.reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Choose a reason for the audit log.' }]);
    if (row.status === 'blocked') {
      return problem(409, 'ALREADY_BLOCKED', 'Already blocked', 'This customer is already blocked.');
    }
    state.customers.patch(row.id, { status: 'blocked', riskLevel: 'high', internalNotes: reason });
  }),

  // Name, email and IMEIs go; payment records stay. The orders mock follows, so the orders list shows the same.
  customerAction('anonymize', async (row, { state, ordersOf }) => {
    const email = `deleted-${row.id}@redacted.invalid`;
    state.customers.patch(row.id, {
      status: 'anonymized',
      name: 'Deleted customer',
      email,
      internalNotes: '',
      marketingOptIn: false,
      phone: '',
      lastIp: null,
      activeSessions: 0,
      hasAccount: false,
      anonymizedAt: new Date().toISOString(),
    });
    for (const order of ordersOf(row.id)) {
      order.imei = `${order.imei.slice(0, 8)}•••••••`;
      order.customer = { id: row.id, name: 'Deleted customer', email };
    }
    await closeRequest(state, row.id, 'erasure');
  }),
];

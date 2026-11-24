// Mock of the privacy routes of an account: `GET /admin/clients/:id/privacy`, `POST /admin/clients/:id/block`, `GET /admin/clients/:id/export` and
// `POST /admin/clients/:id/anonymize`. State changes are simple; the only refusals are an action that does not fit the account's state
// and missing input. Export and anonymize close the account's open request of that kind, as the demo did. Dev and tests only.
import { HttpResponse, type HttpHandler } from 'msw';
import type { MockOrder } from '@/mocks/orders';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import { currentStaff } from '@/mocks/session';
import type { ConsentRecord, DataRequestKind } from '../types';
import { context, rankOf, type Context } from './context';
import { endSessions } from './links';
import { bodyOf, idOf, invalid, noContent, notFound, route, textOf } from './shared';
import type { AccountState, MockAccount } from './types';

const anonymized = () =>
  problem(409, 'ANONYMIZED', 'Account removed', 'This account was anonymized. Nothing can change.');

// The consent records of the latest order: terms, privacy, refund policy and the withdrawal waiver a few seconds before the order, and the
// marketing opt-in when the account has one (the demo's `consentsFor`).
function consentsOf(account: MockAccount, order: MockOrder, state: AccountState): ConsentRecord[] {
  const at = Date.parse(order.createdAt);
  const record = (purpose: string, document: string | null, before: number): ConsentRecord => ({
    purpose,
    document,
    at: toIso(at - before),
    ip: account.checkoutIp,
  });
  return [
    record('terms', state.legal.get('Terms of service') ?? null, 41_000),
    record('privacy', state.legal.get('Privacy policy') ?? null, 41_000),
    record('refund_policy', state.legal.get('Refund policy') ?? null, 41_000),
    record('withdrawal_waiver', null, 38_000),
    ...(account.marketingOptIn ? [record('marketing', null, 36_000)] : []),
  ];
}

// Closes the account's open request of one kind, as the demo did when the data left or was erased.
async function closeRequest(ctx: Context, accountId: number, kind: DataRequestKind): Promise<void> {
  const open = ctx.state.requests
    .list()
    .find(
      (request) =>
        request.accountId === accountId &&
        request.kind === kind &&
        (request.status === 'open' || request.status === 'in_progress'),
    );
  if (!open) return;
  ctx.state.requests.patch(open.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    handledBy: (await currentStaff())?.id ?? null,
  });
}

// `POST /admin/clients/:id/<suffix>` for the actions that need an existing, not anonymized account.
function accountAction(
  suffix: string,
  apply: (account: MockAccount, ctx: Context, body: Record<string, unknown>) => Response | Promise<Response>,
): HttpHandler {
  return route('post', `/admin/clients/:id/${suffix}`, async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    if (account.status === 'anonymized') return anonymized();
    return apply(account, ctx, await bodyOf(call.request));
  });
}

export const privacyRoutes: HttpHandler[] = [
  route('get', '/admin/clients/:id/privacy', async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    const orders = ctx.orders.get(account.id) ?? [];
    const latest = [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    const scored = ctx.state.risk.get(account.id) ?? [];
    return HttpResponse.json({
      marketingOptIn: account.marketingOptIn,
      latestConsents: latest ? { orderId: latest.id, records: consentsOf(account, latest, ctx.state) } : null,
      risk: {
        highestScore: scored.length > 0 ? Math.max(...scored.map((entry) => entry.score)) : null,
        signals: scored.flatMap((entry) => entry.signals.map((text) => ({ text, orderId: entry.orderId }))),
      },
    });
  }),

  route('get', '/admin/clients/:id/export', async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    const data = {
      account: { id: account.id, name: account.name, email: account.email, country: account.country },
      rank: rankOf(ctx, account).name,
      orders: (ctx.orders.get(account.id) ?? []).map((order) => ({
        id: order.id,
        service: order.service.name,
        imei: order.imei,
        status: order.status,
        total: order.totalPrice,
        created: order.createdAt,
      })),
    };
    await closeRequest(ctx, account.id, 'export');
    return new HttpResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="account-${account.id}.json"`,
      },
    });
  }),

  // Blocking keeps the reason as a note and ends the sessions; lifting the block makes the account active again.
  accountAction('block', (account, ctx, body) => {
    if (body.blocked === false) {
      if (account.status !== 'blocked') {
        return problem(409, 'NOT_BLOCKED', 'Not blocked', 'This account is not blocked.');
      }
      ctx.state.accounts.patch(account.id, { status: 'active' });
      return noContent();
    }
    const reason = textOf(body.reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Choose a reason for the audit log.' }]);
    if (account.status === 'blocked') {
      return problem(409, 'ALREADY_BLOCKED', 'Already blocked', 'This account is already blocked.');
    }
    ctx.state.accounts.patch(account.id, {
      status: 'blocked',
      internalNotes: reason,
      security: { ...account.security, activeSessions: 0 },
    });
    return endSessions(account.id).then(() => noContent());
  }),

  // Name, email and IMEIs go; payment records stay. A merchant rank is refused. The orders mock follows, so the orders list shows the same.
  accountAction('anonymize', async (account, ctx) => {
    if (rankOf(ctx, account).rankKind === 'merchant') {
      return problem(
        409,
        'CONFLICT',
        'Move it to the retail rank first',
        'Move the account to the retail rank first.',
      );
    }
    const email = `deleted-account-${account.id}@redacted.invalid`;
    ctx.state.accounts.patch(account.id, {
      status: 'anonymized',
      name: 'Deleted account',
      email,
      phone: '',
      company: '',
      address: '',
      taxId: '',
      internalNotes: '',
      marketingOptIn: false,
      hasAccount: false,
      username: null,
      anonymizedAt: new Date().toISOString(),
      security: { ...account.security, activeSessions: 0 },
    });
    await endSessions(account.id);
    for (const order of ctx.orders.get(account.id) ?? []) {
      order.imei = `${order.imei.slice(0, 8)}•••••••`;
      order.account = { ...order.account, name: 'Deleted account', email };
    }
    await closeRequest(ctx, account.id, 'erasure');
    return noContent();
  }),
];

// Mock of a merchant's wallet routes (`/admin/clients/:id/wallet`, `/statement`, `/wallet/adjust`, `/credit-limit`) and the
// official statement download. The mock refuses what the demo refused (an adjustment over $10,000 and a debit past the credit
// limit) so the dialog has a server answer to show; the real rules and sums are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { problem } from '@/mocks/problem';
import { currentStaff } from '@/mocks/session';
import { postAdjustment } from './adjustment';
import { toWallet } from './dto';
import { bodyOf, idOf, invalid, listResponse, notFound, route, textOf } from './shared';
import { merchantStore } from './store';

/** The demo's limit above which an adjustment needs a second approver. */
const APPROVAL_LIMIT = 10_000;

export const walletRoutes: HttpHandler[] = [
  route('get', '/admin/clients/:id/wallet', async (call) => {
    const row = (await merchantStore()).clients.find(idOf(call));
    return row ? HttpResponse.json(toWallet(row)) : notFound('merchant', call.params.id);
  }),

  route('get', '/admin/clients/:id/statement', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    if (!store.clients.find(id)) return notFound('merchant', call.params.id);
    return listResponse(store.statements.get(id) ?? [], call.request);
  }),

  route('post', '/admin/clients/:id/wallet/adjust', async (call) => {
    const store = await merchantStore();
    const client = store.clients.find(idOf(call));
    if (!client) return notFound('merchant', call.params.id);
    const body = await bodyOf(call.request);
    const amount = Number(body.amount);
    const direction = body.direction === 'debit' ? 'debit' : 'credit';
    const reason = textOf(body.reason);
    const errors = [
      ...(Number.isFinite(amount) && amount > 0
        ? []
        : [{ field: 'amount', message: 'Enter an amount greater than zero.' }]),
      ...(reason.length >= 5 ? [] : [{ field: 'reason', message: 'Add a reason of at least 5 characters.' }]),
    ];
    if (errors.length > 0) return invalid(errors);
    if (amount > APPROVAL_LIMIT) {
      return problem(
        409,
        'APPROVAL_REQUIRED',
        'Second approver needed',
        'Adjustments over $10,000 need a second approver. Split it or ask Finance.',
      );
    }
    if (direction === 'debit' && client.balance - amount < -client.creditLimit) {
      return problem(
        409,
        'CREDIT_LIMIT_EXCEEDED',
        'Credit limit exceeded',
        `This would take the wallet below the credit limit (${money(-client.creditLimit)}).`,
      );
    }
    const staff = await currentStaff();
    const transactionId = await postAdjustment(
      store,
      client,
      { direction, amount, reason },
      { id: staff?.id ?? 0, name: staff?.name ?? 'Staff' },
    );
    const updated = store.clients.find(client.id) ?? client;
    return HttpResponse.json({ transactionId, wallet: toWallet(updated) });
  }),

  route('patch', '/admin/clients/:id/credit-limit', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    if (!store.clients.find(id)) return notFound('merchant', call.params.id);
    const limit = Number((await bodyOf(call.request)).creditLimit);
    if (!Number.isFinite(limit) || limit < 0) {
      return invalid([{ field: 'creditLimit', message: 'Enter an amount of zero or more.' }]);
    }
    const row = store.clients.patch(id, { creditLimit: limit });
    return row ? HttpResponse.json(toWallet(row)) : notFound('merchant', id);
  }),

  // The real server answers with the official statement file; the mock sends a small stand-in with a file name.
  route('get', '/admin/reports/client-statement/:clientId', async (call) => {
    const id = idOf(call, 'clientId');
    if (!(await merchantStore()).clients.find(id)) return notFound('merchant', call.params.clientId);
    return new HttpResponse(`Mock statement for merchant ${id}`, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="statement-${id}-mock.pdf"`,
      },
    });
  }),
];

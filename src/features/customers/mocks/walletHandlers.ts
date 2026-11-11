// Mock of the customer balance routes (`GET /admin/customers/:id/wallet`, `/wallet/statement`, and `POST …/wallet/adjust|freeze|unfreeze`).
// The mock keeps the refusals the dialogs must show (an amount over the approval limit, a debit below zero, a customer with no
// account, a hold that cannot be lifted) and honours the Idempotency-Key the console sends. Real rules are the server's (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { customerState } from './store';
import type { MockCustomer } from './types';
import { ensureSeedJournals, fromUnits, postToWallet, toUnits, walletOf, walletState } from './walletStore';

// The staff member's wallet routes need the session, a customer, and for a write the key; this finds them or answers instead.
async function target(
  request: Request,
  id: unknown,
  options: { write: boolean },
): Promise<{ customer: MockCustomer; key: string } | Response> {
  const denied = guard(request);
  if (denied) return denied;
  await latency();
  const customer = (await customerState()).customers.find(String(id));
  if (!customer) return notFound('customer', id);
  const key = request.headers.get('Idempotency-Key')?.trim() ?? '';
  if (options.write && !key) {
    return invalid([{ field: 'idempotency-key', message: 'Send an Idempotency-Key header.' }]);
  }
  return { customer, key };
}

const reasonProblem = (reason: string, max: number) =>
  reason.length < 5
    ? 'Add a reason of at least 5 characters.'
    : reason.length > max
      ? `Keep the reason to ${max} characters or fewer.`
      : null;

async function adjust(customer: MockCustomer, key: string, body: Record<string, unknown>): Promise<Response> {
  const wallet = await walletState();
  const amountText = textOf(body.amount);
  const units = toUnits(amountText);
  const direction = body.direction === 'debit' ? 'debit' : body.direction === 'credit' ? 'credit' : null;
  const reason = textOf(body.reason);
  const errors = [
    ...(units > 0 ? [] : [{ field: 'amount', message: 'Enter an amount greater than zero.' }]),
    ...(direction ? [] : [{ field: 'direction', message: 'Choose credit or debit.' }]),
    ...(reasonProblem(reason, 140)
      ? [{ field: 'reason', message: reasonProblem(reason, 140) as string }]
      : []),
  ];
  if (errors.length > 0) return invalid(errors);

  // A key used before answers the first adjustment; the same key for another request is refused.
  const replayKey = `${customer.id}:${key}`;
  const fingerprint = JSON.stringify([fromUnits(units), direction, reason]);
  const replay = wallet.replays.get(replayKey);
  if (replay) {
    if (replay.fingerprint !== fingerprint) {
      return problem(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Key already used',
        'This Idempotency-Key was already used for a different adjustment.',
      );
    }
    return HttpResponse.json({ ...replay.answer, wallet: await walletOf(customer.id) });
  }

  if (customer.status === 'anonymized') {
    return problem(
      409,
      'ANONYMIZED',
      'Customer removed',
      'This customer was anonymised. Nothing can change.',
    );
  }
  if (direction === 'credit' && !customer.hasAccount) {
    return problem(
      409,
      'NO_ACCOUNT',
      'No account',
      'This customer has no account, so there is no balance to add to.',
    );
  }
  const figures = await walletOf(customer.id);
  if (units > toUnits(figures.adjustApprovalLimit)) {
    return problem(
      409,
      'APPROVAL_REQUIRED',
      'Second approver needed',
      `Adjustments above ${fromUnits(toUnits(figures.adjustApprovalLimit))} need a second approver.`,
    );
  }
  if (direction === 'debit' && units > toUnits(figures.balance)) {
    return problem(
      402,
      'INSUFFICIENT_FUNDS',
      'Not enough balance',
      'A debit cannot take the balance below zero.',
    );
  }
  const staff = await currentStaff();
  const transactionId = await postToWallet({
    customer,
    kind: 'adjustment',
    memo: `Manual ${direction}: ${reason}`,
    units: direction === 'credit' ? units : -units,
    by: staff?.name ?? 'Staff',
    otherKind: 'adjustments',
  });
  wallet.replays.set(replayKey, { fingerprint, answer: { transactionId } });
  return HttpResponse.json({ transactionId, wallet: await walletOf(customer.id) });
}

export const walletHandlers: HttpHandler[] = [
  http.get('*/admin/customers/:id/wallet', async ({ request, params }) => {
    const found = await target(request, params.id, { write: false });
    return found instanceof Response ? found : HttpResponse.json(await walletOf(found.customer.id));
  }),

  http.get('*/admin/customers/:id/wallet/statement', async ({ request, params }) => {
    const found = await target(request, params.id, { write: false });
    if (found instanceof Response) return found;
    await ensureSeedJournals();
    const rows = (await walletState()).statements.get(found.customer.id) ?? [];
    const { page, total } = applyListQuery([...rows], new URL(request.url).searchParams);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  http.post('*/admin/customers/:id/wallet/adjust', async ({ request, params }) => {
    const found = await target(request, params.id, { write: true });
    return found instanceof Response ? found : adjust(found.customer, found.key, await bodyOf(request));
  }),

  http.post('*/admin/customers/:id/wallet/freeze', async ({ request, params }) => {
    const found = await target(request, params.id, { write: true });
    if (found instanceof Response) return found;
    const reason = textOf((await bodyOf(request)).reason);
    const bad = reasonProblem(reason, 200);
    if (bad) return invalid([{ field: 'reason', message: bad }]);
    const wallet = await walletState();
    // Freezing a frozen balance changes nothing.
    if (!wallet.holds.has(found.customer.id)) {
      wallet.holds.set(found.customer.id, { at: new Date().toISOString(), reason });
      wallet.changedAt.set(found.customer.id, new Date().toISOString());
    }
    return HttpResponse.json(await walletOf(found.customer.id));
  }),

  http.post('*/admin/customers/:id/wallet/unfreeze', async ({ request, params }) => {
    const found = await target(request, params.id, { write: true });
    if (found instanceof Response) return found;
    const reason = textOf((await bodyOf(request)).reason);
    const bad = reasonProblem(reason, 200);
    if (bad) return invalid([{ field: 'reason', message: bad }]);
    const wallet = await walletState();
    if ((wallet.balances.get(found.customer.id) ?? 0) < 0) {
      return problem(
        409,
        'CONFLICT',
        'Balance below zero',
        'Bring the balance to zero before lifting the hold.',
      );
    }
    wallet.holds.delete(found.customer.id);
    return HttpResponse.json(await walletOf(found.customer.id));
  }),
];

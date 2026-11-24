// Mock of the payment routes (`/admin/payments*`): the deposit list, one deposit, and the approve and reject decisions. An
// approval posts the deposit's ledger entry and settles its invoice, so the trial balance, the ledger and the invoices follow.
// The top-up of a store balance is credited by the accounts mock.
// Mocks fake answers only (decision 014): the one rule kept is that a deposit is decided once.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { creditTopUp, markTopUp } from '@/features/accounts/mocks';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { postLedger, type LedgerLine } from '@/mocks/ledger';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { methodLabel, paymentLabel } from '../lib/payments';
import type { Payment } from '../types';
import { invoiceStore } from './invoices';
import { paymentStore, withWallets } from './paymentStore';

const TOTAL_HEADERS = { 'access-control-expose-headers': 'x-total-count' };

// The list filters the generic mock cannot read: `owner` (merchant or customer, the kind of wallet) is not a field of the row, and the
// buyer is `accountId` (`clientId` is its alias): the id of the row's `client` or `customer`, which are both account ids.
function listFor(rows: Payment[], params: URLSearchParams): { rows: Payment[]; params: URLSearchParams } {
  const next = new URLSearchParams(params);
  const owner = next.get('owner');
  next.delete('owner');
  const account = next.get('accountId') ?? next.get('clientId');
  next.delete('accountId');
  next.delete('clientId');
  return {
    rows: rows
      .filter((row) => owner !== 'customer' || row.customer !== null)
      .filter((row) => owner !== 'merchant' || row.client !== null)
      .filter((row) => !account || String((row.client ?? row.customer)?.id) === account),
    params: next,
  };
}

// `customerId` is not a filter any more: the server answers 422 and names the one to use (decision 023).
const customerIdRefused = () =>
  invalid([{ field: 'customerId', message: 'Filter by accountId: a buyer is an account now.' }]);

// The deposit's journal: the money in (the bank, or the gateway for card and USDT), the wallet credit and the fee income.
async function postDeposit(payment: Payment, by: string): Promise<void> {
  const gross = Number(payment.amount);
  const net = Number(payment.netAmount);
  const fee = Math.round((gross - net) * 10_000) / 10_000;
  const owner = payment.client
    ? { ownerType: 'account' as const, ownerId: payment.client.id, ownerName: payment.client.name }
    : {};
  const lines: LedgerLine[] = [
    {
      kind: payment.methodType === 'card' || payment.methodType === 'usdt' ? 'gateway_clearing' : 'bank',
      amount: gross,
    },
    { kind: 'client_wallet', ...owner, amount: -net },
    ...(fee > 0 ? [{ kind: 'fee_income', amount: -fee }] : []),
  ];
  const entry = await postLedger({
    kind: 'deposit',
    memo: `Deposit ${paymentLabel(payment.id)} (${methodLabel(payment)})`,
    orderId: payment.id,
    by,
    lines,
  });
  entry.refType = 'payment';
}

// The pending payment named by the request, or the answer to send back instead.
async function pendingPayment(id: unknown): Promise<Payment | Response> {
  const payment = (await paymentStore()).find(String(id));
  if (!payment) return notFound('payment', id);
  if (payment.status !== 'pending') {
    return problem(
      409,
      'PAYMENT_ALREADY_REVIEWED',
      'Already decided',
      `${paymentLabel(payment.id)} was already ${payment.status}.`,
    );
  }
  return payment;
}

export const paymentHandlers: HttpHandler[] = [
  http.get('*/admin/payments', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const query = new URL(request.url).searchParams;
    if (query.has('customerId')) return customerIdRefused();
    const all = await withWallets((await paymentStore()).list());
    const { rows, params } = listFor(all, query);
    const { page, total } = applyListQuery(rows, params, [
      'gatewayTxnId',
      'client.name',
      'customer.name',
      'customer.email',
    ]);
    return HttpResponse.json(page, { headers: { 'x-total-count': String(total), ...TOTAL_HEADERS } });
  }),

  http.get('*/admin/payments/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const payment = (await paymentStore()).find(String(params.id));
    return payment ? HttpResponse.json((await withWallets([payment]))[0]) : notFound('payment', params.id);
  }),

  http.post('*/admin/payments/:id/approve', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const payment = await pendingPayment(params.id);
    if (payment instanceof Response) return payment;
    const staff = await currentStaff();
    const by = staff?.name ?? 'Staff';
    const now = new Date().toISOString();
    const updated = (await paymentStore()).patch(payment.id, {
      status: 'approved',
      capturedAt: now,
      reviewedAt: now,
      reviewedBy: { id: staff?.id ?? null, name: by },
    }) as Payment;
    // The top-up of a store balance is credited by the accounts mock; a merchant wallet's deposit posts its own journal.
    if (updated.customer) await creditTopUp(updated.id, by);
    else await postDeposit(updated, by);
    if (updated.invoiceId !== null) {
      (await invoiceStore()).patch(updated.invoiceId, { status: 'paid', paidAt: now });
    }
    return HttpResponse.json((await withWallets([updated]))[0]);
  }),

  http.post('*/admin/payments/:id/reject', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const payment = await pendingPayment(params.id);
    if (payment instanceof Response) return payment;
    const reason = textOf((await bodyOf(request)).reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Say why the deposit is rejected.' }]);
    const staff = await currentStaff();
    const updated = (await paymentStore()).patch(payment.id, {
      status: 'rejected',
      note: reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: { id: staff?.id ?? null, name: staff?.name ?? 'Staff' },
    }) as Payment;
    if (updated.customer) await markTopUp(updated.id, 'rejected');
    if (updated.invoiceId !== null) (await invoiceStore()).patch(updated.invoiceId, { status: 'void' });
    return HttpResponse.json((await withWallets([updated]))[0]);
  }),
];

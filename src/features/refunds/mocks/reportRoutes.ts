// Mock of the storefront payments report (`GET /admin/reports/payments`): the comparison of the payment methods, one page of the
// payments filtered by method and sorted, and the totals of the page's strip. Ports the sums the demo made in the browser
// (tabPayments and refundStrip of 53-p-refunds.js). The real server does these sums (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { round } from '@/lib/format';
import { applyListQuery } from '@/mocks/crud';
import { latency } from '@/mocks/latency';
import { toMoney } from '@/mocks/seed';
import { guard } from '@/mocks/session';
import { PAYMENT_METHODS } from '../lib/labels';
import type { PaymentMethodSummary, PaymentsTotals } from '../types';
import type { RefundsMockState } from './seed';
import { refundsState } from './store';

const DAY = 86_400_000;

const add = (total: number, value: string) => total + Number(value);

function methodSummaries(state: RefundsMockState): PaymentMethodSummary[] {
  const refunds = state.refunds.list().filter((refund) => refund.status === 'completed');
  const disputes = state.disputes.list();
  return PAYMENT_METHODS.map((method) => {
    const lines = state.payments.list().filter((payment) => payment.method === method);
    const orders = new Set(lines.map((payment) => payment.orderId));
    const volume = lines.reduce((total, line) => add(total, line.amount), 0);
    const fees = lines.reduce((total, line) => add(total, line.feeAmount), 0);
    return {
      method,
      payments: lines.length,
      volume: toMoney(volume),
      fees: toMoney(fees),
      feeRate: String(volume ? round((fees / volume) * 100, 2) : 0),
      refunds: refunds.filter((refund) => orders.has(refund.orderId)).length,
      disputes: disputes.filter((dispute) => orders.has(dispute.orderId)).length,
    };
  });
}

function totalsOf(state: RefundsMockState): PaymentsTotals {
  const since = Date.now() - 30 * DAY;
  const refunds = state.refunds.list();
  const done = refunds.filter(
    (refund) => refund.status === 'completed' && Date.parse(refund.completedAt ?? refund.createdAt) >= since,
  );
  const refunded = done.reduce((total, refund) => add(total, refund.amount), 0);
  const waiting = refunds
    .filter((refund) => refund.status === 'requested' || refund.status === 'failed')
    .reduce((total, refund) => add(total, refund.amount), 0);
  return {
    refundedCount: done.length,
    refundedAmount: toMoney(refunded),
    refundedPercentOfSales: String(state.sales30d ? round((refunded / state.sales30d) * 100, 1) : 0),
    awaitingAmount: toMoney(waiting),
    chargebackLoss: toMoney(state.chargebackLoss),
  };
}

export const reportHandlers: HttpHandler[] = [
  http.get('*/admin/reports/payments', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await refundsState();
    // Newest first unless the request names a sort.
    const rows = state.payments.list().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, [
      'orderId',
      'customer.name',
    ]);
    return HttpResponse.json({
      methods: methodSummaries(state),
      payments: page,
      total,
      totals: totalsOf(state),
    });
  }),
];

// Mock of the invoice routes (`/admin/invoices*`): the list, one invoice, and issuing a manual invoice for a merchant.
// Mocks fake answers only (decision 014): the amount and merchant checks below stand in for the server's own.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import { guard } from '@/mocks/session';
import type { ProblemError } from '@/mocks/problem';
import type { Invoice } from '../types';
import { invoiceNumber, invoiceStore } from './invoices';

const DAY_MS = 86_400_000;

export const invoiceHandlers: HttpHandler[] = [
  http.get('*/admin/invoices', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { page, total } = applyListQuery((await invoiceStore()).list(), new URL(request.url).searchParams, [
      'number',
      'client.name',
      'customer.name',
    ]);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  http.get('*/admin/invoices/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const invoice = (await invoiceStore()).find(String(params.id));
    return invoice ? HttpResponse.json(invoice) : notFound('invoice', params.id);
  }),

  http.post('*/admin/invoices', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const amount = textOf(body.amount);
    const description = textOf(body.description);
    const state = await loadDemoState();
    const merchant = demoRows<{ id: string; name: string; cc: string }>(state, 'merchants').find(
      (candidate) => demoNumericId(candidate.id) === Number(body.clientId),
    );

    const errors: ProblemError[] = [];
    if (!merchant) errors.push({ field: 'clientId', message: 'Choose a merchant that exists.' });
    if (!/^\d+(\.\d{1,4})?$/.test(amount) || !/[1-9]/.test(amount)) {
      errors.push({ field: 'amount', message: 'Enter an amount greater than zero.' });
    }
    if (!description) errors.push({ field: 'description', message: 'Say what the invoice is for.' });
    if (errors.length > 0 || !merchant) return invalid(errors);

    const invoices = await invoiceStore();
    const id = invoices.list().reduce((max, row) => Math.max(max, row.id), 0) + 1;
    const now = Date.now();
    const createdAt = toIso(now);
    const created = invoices.insert({
      id,
      number: invoiceNumber(createdAt, id),
      kind: 'manual',
      status: 'open',
      amount: toMoney(Number(amount)),
      fee: toMoney(0),
      netAmount: toMoney(Number(amount)),
      taxAmount: toMoney(0),
      taxRate: toMoney(0),
      taxCountry: merchant.cc,
      customerVatId: '',
      total: toMoney(Number(amount)),
      currency: 'USD',
      client: { id: demoNumericId(merchant.id), name: merchant.name },
      customer: null,
      orderId: null,
      pdfFileId: null,
      description,
      dueAt: toIso(now + 14 * DAY_MS),
      paidAt: null,
      createdAt,
    } satisfies Invoice);
    return HttpResponse.json(created, { status: 201 });
  }),
];

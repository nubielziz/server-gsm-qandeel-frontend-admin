// Mock routes of the supplier connections: `CRUD /admin/suppliers`. They fake the answers and keep simple state; the refusals
// are the obvious ones (a bad name or address, a supplier that is in use). The real server decides everything (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { problem, type ProblemError } from '@/mocks/problem';
import { mockScenario } from '@/mocks/scenario';
import { toMoney } from '@/mocks/seed';
import type { MockSupplier, SuppliersState } from './seed';
import { secured } from './secured';
import { openCounts, toDetail, toSupplier } from './store';

const URL_START = /^https?:\/\/[^\s/]+\.[a-z]{2,}/i;
const num = (value: unknown): number | undefined =>
  Number.isFinite(Number(value)) && value !== '' ? Number(value) : undefined;

// What a create or an edit is refused for: the fields the real server would name.
function problems(
  data: SuppliersState,
  body: Record<string, unknown>,
  ownId: number | null,
  creating: boolean,
) {
  const errors: ProblemError[] = [];
  const name = textOf(body.name);
  if ((creating || 'name' in body) && name.length < 2)
    errors.push({ field: 'name', message: 'Enter a supplier name.' });
  if (
    name &&
    data.suppliers.list().some((row) => row.id !== ownId && row.name.toLowerCase() === name.toLowerCase())
  ) {
    errors.push({ field: 'name', message: 'A supplier with this name already exists.' });
  }
  if ((creating || 'baseUrl' in body) && !URL_START.test(textOf(body.baseUrl))) {
    errors.push({ field: 'baseUrl', message: 'Enter a valid URL, like https://api.example.com.' });
  }
  if (creating && !textOf(body.apiKey)) errors.push({ field: 'apiKey', message: 'Enter the API key.' });
  return errors;
}

// The fields of a body that are stored as they are.
function applyFields(row: MockSupplier, body: Record<string, unknown>): void {
  if (typeof body.name === 'string') row.name = textOf(body.name);
  if (typeof body.driver === 'string') row.driver = body.driver;
  if (typeof body.baseUrl === 'string') row.baseUrl = textOf(body.baseUrl);
  if (typeof body.username === 'string') row.username = textOf(body.username);
  if (typeof body.currency === 'string') row.currency = textOf(body.currency).toUpperCase();
  if (typeof body.lowBalanceAlert === 'string' && num(body.lowBalanceAlert) !== undefined) {
    row.lowBalanceAlert = toMoney(Number(body.lowBalanceAlert));
  }
  row.maxConcurrency = num(body.maxConcurrency) ?? row.maxConcurrency;
  row.rateLimitPerMin = num(body.rateLimitPerMin) ?? row.rateLimitPerMin;
  row.timeoutMs = num(body.timeoutMs) ?? row.timeoutMs;
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) row.apiKeyHint = body.apiKey.trim().slice(0, 5);
  if (body.status === 'active' || body.status === 'disabled' || body.status === 'paused')
    row.status = body.status;
}

/** The routes for listing, reading, connecting, editing and deleting suppliers. */
export const supplierHandlers: HttpHandler[] = [
  http.get(
    '*/admin/suppliers/:id',
    secured(async ({ params, data }) => {
      const row = data.suppliers.find(String(params.id));
      return row ? HttpResponse.json(await toDetail(data, row)) : notFound('supplier', params.id);
    }),
  ),

  http.get(
    '*/admin/suppliers',
    secured(async ({ request, data }) => {
      const rows = await Promise.all(data.suppliers.list().map(toSupplier));
      const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, [
        'name',
        'baseUrl',
        'driver',
      ]);
      return HttpResponse.json(page, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  ),

  http.post(
    '*/admin/suppliers',
    secured(async ({ data, body }) => {
      const input = await body();
      const errors = problems(data, input, null, true);
      if (errors.length > 0) return invalid(errors);
      const row = data.suppliers.insert({
        name: textOf(input.name),
        driver: textOf(input.driver) || 'dhru',
        baseUrl: textOf(input.baseUrl),
        username: textOf(input.username),
        currency: textOf(input.currency).toUpperCase() || 'USD',
        creditRate: '1.0000',
        status: 'active',
        apiKeyHint: textOf(input.apiKey).slice(0, 5),
        health: 'up',
        successRate1h: null,
        successRate24h: null,
        p50Ms: null,
        p95Ms: null,
        balance: '0.0000',
        balanceCheckedAt: null,
        lowBalanceAlert: toMoney(num(input.lowBalanceAlert) ?? 150),
        lowBalance: false,
        runwayDays: null,
        maxConcurrency: num(input.maxConcurrency) ?? 5,
        rateLimitPerMin: num(input.rateLimitPerMin) ?? 60,
        timeoutMs: num(input.timeoutMs) ?? 15_000,
        createdAt: new Date().toISOString(),
        history: [],
      });
      return HttpResponse.json(await toDetail(data, row), { status: 201 });
    }),
  ),

  http.patch(
    '*/admin/suppliers/:id',
    secured(async ({ params, data, body }) => {
      // The `readonly` dev scenario signs in a viewer, whom the real API refuses (System health's Pause, for one).
      if (mockScenario() === 'readonly') {
        return problem(403, 'FORBIDDEN', 'Forbidden', 'You need the suppliers:update permission.');
      }
      const row = data.suppliers.find(String(params.id));
      if (!row) return notFound('supplier', params.id);
      const input = await body();
      const errors = problems(data, input, row.id, false);
      if (errors.length > 0) return invalid(errors);
      applyFields(row, input);
      return HttpResponse.json(await toDetail(data, row));
    }),
  ),

  http.delete(
    '*/admin/suppliers/:id',
    secured(async ({ params, data }) => {
      const row = data.suppliers.find(String(params.id));
      if (!row) return notFound('supplier', params.id);
      const { openOrders } = await openCounts(row.id);
      const linked = data.links.filter(
        (link) => data.catalogue.find(link.supplierServiceId)?.supplierId === row.id,
      );
      if (openOrders > 0 || linked.length > 0) {
        return problem(
          409,
          'SUPPLIER_IN_USE',
          `${row.name} is still in use`,
          `It has ${openOrders} open orders and ${linked.length} linked services. Disable it instead, or move them first.`,
        );
      }
      data.suppliers.remove(row.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

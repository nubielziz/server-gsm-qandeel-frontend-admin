// Mock of the service routes (`/admin/services` and `/admin/services/:id`): list with the toolbar filters, one service with its parts,
// create, change and delete. The mock plays the server: it works out the floor and refuses a price under it, keeps codes unique, and
// refuses to delete a service that has orders.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { orderStore } from '@/mocks/orders';
import { toDetail, toService } from './dto';
import { bodyOf, conflict, idOf, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { floorOf, round } from './pricing';
import { servicesStore } from './store';
import type { MockService } from './types';

const SEARCH_FIELDS = ['name', 'code', 'category.name'];
const TYPES = ['imei', 'server', 'remote', 'file'];

/** A body amount (`"12.5"` or `12.5`) as a number, or null when it is not one. */
function amountOf(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
}

type Problems = { field: string; message: string }[];

/** Applies the fields of a body to a service, collecting the problems; the caller saves nothing when there are any. */
function applyFields(row: MockService, body: Record<string, unknown>, problems: Problems) {
  const draft = { ...row };
  if ('name' in body) {
    draft.name = textOf(body.name);
    if (!draft.name) problems.push({ field: 'name', message: 'Enter a name.' });
  }
  if ('code' in body) {
    draft.code = textOf(body.code);
    if (!draft.code) problems.push({ field: 'code', message: 'Enter a code.' });
  }
  if ('type' in body) {
    if (typeof body.type === 'string' && TYPES.includes(body.type))
      draft.type = body.type as MockService['type'];
    else problems.push({ field: 'type', message: 'Choose a type.' });
  }
  if ('slaMinutes' in body) {
    const sla = amountOf(body.slaMinutes);
    if (sla !== null && Number.isInteger(sla) && sla >= 1) draft.slaMinutes = sla;
    else problems.push({ field: 'slaMinutes', message: 'Enter minutes, 1 or more.' });
  }
  if ('minProfit' in body) {
    const profit = amountOf(body.minProfit);
    if (profit !== null && profit >= 0) draft.minProfit = round(profit, 2);
    else problems.push({ field: 'minProfit', message: 'Enter an amount, 0 or more.' });
  }
  if ('basePrice' in body) {
    const price = amountOf(body.basePrice);
    if (price === null || price <= 0)
      problems.push({ field: 'basePrice', message: 'Enter a price greater than zero.' });
    else draft.price = round(price, 2);
  }
  if ('status' in body) {
    if (body.status === 'active' || body.status === 'disabled') draft.status = body.status;
    else problems.push({ field: 'status', message: 'Use active or disabled.' });
  }
  if ('executionMode' in body) {
    if (body.executionMode === 'auto' || body.executionMode === 'manual')
      draft.auto = body.executionMode === 'auto';
    else problems.push({ field: 'executionMode', message: 'Use auto or manual.' });
  }
  return draft;
}

/** The service routes. */
export const serviceRoutes: HttpHandler[] = [
  http.get('*/admin/services', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      return listAnswer(
        stores.services.list().map((row) => toService(stores, row)),
        request,
        SEARCH_FIELDS,
      );
    }),
  ),

  http.get('*/admin/services/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.services.find(String(params.id));
      return row ? HttpResponse.json(toDetail(stores, row)) : notFound('service', params.id);
    }),
  ),

  http.post('*/admin/services', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const body = await bodyOf(request);
      const problems: Problems = [];
      const categoryId = idOf(body.categoryId);
      if (categoryId === null || !stores.categories.find(categoryId)) {
        problems.push({ field: 'categoryId', message: 'Choose a category.' });
      }
      const blank: MockService = {
        id: 0,
        code: '',
        name: '',
        type: 'imei',
        categoryId: categoryId ?? 0,
        cost: 0,
        costWas: null,
        price: 0,
        minProfit: 0,
        slaMinutes: 60,
        supplierId: null,
        fallbackId: null,
        status: 'active',
        auto: true,
        fields: [],
        options: [],
        groupPrices: [],
      };
      const draft = applyFields(blank, body, problems);
      for (const field of ['name', 'code', 'basePrice'] as const) {
        if (!(field in body)) problems.push({ field, message: 'This field is required.' });
      }
      if (problems.length > 0) return invalid(problems);
      const taken = stores.services.list().find((row) => row.code.toLowerCase() === draft.code.toLowerCase());
      if (taken) {
        const message = `The code ${draft.code} is already used by ${taken.name}.`;
        return conflict('CODE_TAKEN', 'Code already used', message, [{ field: 'code', message }]);
      }
      const { id: _id, ...fields } = draft;
      return HttpResponse.json(toService(stores, stores.services.insert(fields)), { status: 201 });
    }),
  ),

  http.patch('*/admin/services/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.services.find(String(params.id));
      if (!row) return notFound('service', params.id);
      const body = await bodyOf(request);
      const problems: Problems = [];
      const draft = applyFields(row, body, problems);
      if ('categoryId' in body) {
        const categoryId = idOf(body.categoryId);
        if (categoryId !== null && stores.categories.find(categoryId)) draft.categoryId = categoryId;
        else problems.push({ field: 'categoryId', message: 'Choose a category.' });
      }
      // The demo refused a price under the floor (`setPrice` in 11-state.js); the floor uses the minimum profit being saved.
      if (
        'basePrice' in body &&
        problems.every((problem) => problem.field !== 'basePrice') &&
        draft.price < floorOf(draft) - 0.004
      ) {
        problems.push({
          field: 'basePrice',
          message: `Below the floor. Cost ${money(draft.cost)} plus minimum profit ${money(draft.minProfit)} is ${money(floorOf(draft))}.`,
        });
      }
      if (problems.length > 0) return invalid(problems);
      const taken = stores.services
        .list()
        .find((other) => other.id !== row.id && other.code.toLowerCase() === draft.code.toLowerCase());
      if (taken) {
        const message = `The code ${draft.code} is already used by ${taken.name}.`;
        return conflict('CODE_TAKEN', 'Code already used', message, [{ field: 'code', message }]);
      }
      const { id: _id, ...changes } = draft;
      return HttpResponse.json(toService(stores, stores.services.patch(row.id, changes) ?? row));
    }),
  ),

  http.delete('*/admin/services/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.services.find(String(params.id));
      if (!row) return notFound('service', params.id);
      const orders = (await orderStore()).list().filter((order) => order.service.id === row.id).length;
      if (orders > 0) {
        return conflict(
          'SERVICE_IN_USE',
          'Service has orders',
          `${row.name} has ${orders} ${orders === 1 ? 'order' : 'orders'}, so it cannot be deleted. Disable it instead.`,
        );
      }
      stores.services.remove(row.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

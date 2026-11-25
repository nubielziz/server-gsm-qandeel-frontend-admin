// Mock of the service routes (`/admin/services` and `/admin/services/:id`): list with the toolbar and Catalog filters, one service with
// its parts, create, change and delete. The mock plays the server: it works out the floor and refuses a price under it, refuses to
// turn off "Delivered from code stock" while codes are in stock, keeps codes unique, refuses to delete a service that has orders, joins the supplier chain and the shop facts of the other mocks into every row
// (catalog.ts), and answers 403 for a shop filter the session may not use.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { orderStore } from '@/mocks/orders';
import { serviceJoin, factsOf, passesListFilters, readListFilters } from './serviceFacts';
import { toDetail, toService } from './dto';
import { bodyOf, conflict, idOf, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { storedOrder } from './priceGridRoutes';
import { costOf, floorOf, round } from './pricing';
import { applyQuantity } from './quantityRule';
import { servicesStore } from './store';
import type { MockService } from './types';

const SEARCH_FIELDS = ['name', 'code', 'category.name'];
const TYPES = ['imei', 'server', 'remote', 'file'];
/** The longest verification window the server accepts, in hours (30 days). */
const MAX_VERIFY_WINDOW_H = 720;

/** A body amount (`"12.5"` or `12.5`) as a number, or null when it is not one. */
function amountOf(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
}

type Problems = { field: string; message: string; code?: string }[];

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
  for (const key of ['allowCancel', 'allowVerify', 'stockDelivery'] as const) {
    if (!(key in body)) continue;
    if (typeof body[key] === 'boolean') draft[key] = body[key];
    else problems.push({ field: key, message: 'Use true or false.' });
  }
  if ('ownCost' in body) {
    const own = amountOf(body.ownCost);
    if (own !== null && own >= 0) draft.ownCost = round(own, 4);
    else problems.push({ field: 'ownCost', message: 'Enter an amount, 0 or more.' });
  }
  if ('verifyWindowH' in body) {
    const hours = amountOf(body.verifyWindowH);
    if (hours !== null && Number.isInteger(hours) && hours >= 0 && hours <= MAX_VERIFY_WINDOW_H)
      draft.verifyWindowH = hours;
    else problems.push({ field: 'verifyWindowH', message: `Enter hours, 0 to ${MAX_VERIFY_WINDOW_H}.` });
  }
  Object.assign(draft, applyQuantity(draft, body, problems));
  return draft;
}

/** The service routes. */
export const serviceRoutes: HttpHandler[] = [
  http.get('*/admin/services', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const join = await serviceJoin();
      const query = readListFilters(new URL(request.url).searchParams, join);
      if (query instanceof Response) return query;
      const kept = stores.services
        .list()
        .filter((row) => passesListFilters(query.filters, row, factsOf(stores, row, join)));
      // `sort` is the stored order (the rows carry no such field): put them in it here; the generic sort below then keeps their order.
      if (query.rest.get('_sort') === 'sort') {
        kept.sort(storedOrder(stores));
        if (query.rest.get('_order')?.toLowerCase() === 'desc') kept.reverse();
      }
      const rows = kept.map((row) => toService(stores, row, join));
      return listAnswer(rows, request, SEARCH_FIELDS, query.rest);
    }),
  ),

  http.get('*/admin/services/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.services.find(String(params.id));
      return row
        ? HttpResponse.json(toDetail(stores, row, await serviceJoin()))
        : notFound('service', params.id);
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
        ownCost: 0,
        stockDelivery: false,
        costWas: null,
        price: 0,
        minProfit: 0,
        slaMinutes: 60,
        minQty: 1,
        maxQty: 1,
        qtyOptions: [],
        allowCancel: false,
        allowVerify: false,
        verifyWindowH: 0,
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
      const created = stores.services.insert(fields);
      return HttpResponse.json(toService(stores, created, await serviceJoin()), { status: 201 });
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
      // Codes still in stock would have no service that delivers them: the server asks for them to be voided first.
      const inStock = stores.codes
        .list()
        .filter((code) => code.serviceId === row.id && code.status === 'available').length;
      if (body.stockDelivery === false && inStock > 0) {
        problems.push({
          field: 'stockDelivery',
          code: 'codes_in_stock',
          message: `Void the ${inStock} ${inStock === 1 ? 'code' : 'codes'} in stock first.`,
        });
      }
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
          message: `Below the floor. Cost ${money(costOf(draft))} plus minimum profit ${money(draft.minProfit)} is ${money(floorOf(draft))}.`,
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
      // `cost_was` as the server keeps it: a rise of the cost used (an own cost above the old one) keeps the FIRST older cost, a fall leaves it,
      // and saving a base price clears it (the answer to "the cost changed").
      if ('basePrice' in body) draft.costWas = null;
      else if (costOf(draft) > costOf(row)) draft.costWas = row.costWas ?? costOf(row);
      const { id: _id, ...changes } = draft;
      const changed = stores.services.patch(row.id, changes) ?? row;
      return HttpResponse.json(toService(stores, changed, await serviceJoin()));
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

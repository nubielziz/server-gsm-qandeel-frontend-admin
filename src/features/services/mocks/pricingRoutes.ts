// Mock of the pricing actions: the bulk price change (preview and apply) and the price resolver (`GET /admin/pricing/resolve`).
// The mock plays the server: it works out each new price, tells which ones fall under their floor, and resolves a price step by step.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toMoney } from '@/mocks/seed';
import { bodyOf, idOf, invalid, notFound, signedIn } from './http';
import { changedPrice, floorOf, isBelowFloor, resolve } from './pricing';
import type { Stores } from './seed';
import { servicesStore } from './store';
import type { MockService } from './types';
import type { BulkPriceLine } from '../types';

type Plan = { lines: BulkPriceLine[]; targets: { row: MockService; price: number }[] } | Response;

/** Reads a bulk body and works out every new price; a bad body is answered with the 422 to return. */
function plan(stores: Stores, body: Record<string, unknown>): Plan {
  const change = (typeof body.change === 'object' && body.change !== null ? body.change : {}) as Record<
    string,
    unknown
  >;
  const value = Number(change.value);
  const type = change.type;
  if ((type !== 'percent' && type !== 'fixed') || !Number.isFinite(value) || value === 0) {
    return invalid([{ field: 'amount', message: 'Enter an amount greater than zero.' }]);
  }
  let rows: MockService[];
  if (Array.isArray(body.serviceIds)) {
    const ids = body.serviceIds.map(Number);
    rows = stores.services.list().filter((service) => ids.includes(service.id));
  } else if (idOf(body.categoryId) !== null) {
    rows = stores.services.list().filter((service) => service.categoryId === idOf(body.categoryId));
  } else {
    return invalid([{ field: 'scope', message: 'Choose a category or tick some services.' }]);
  }
  const targets = rows.map((row) => ({ row, price: changedPrice(row.price, type, value) }));
  const broken = targets.find((target) => target.price <= 0);
  if (broken) {
    return invalid([{ field: 'amount', message: `The change would make ${broken.row.name} free.` }]);
  }
  const lines: BulkPriceLine[] = targets.map(({ row, price }) => ({
    serviceId: row.id,
    name: row.name,
    code: row.code,
    oldPrice: toMoney(row.price),
    newPrice: toMoney(price),
    floorPrice: toMoney(floorOf(row)),
    belowFloor: isBelowFloor(row, price),
  }));
  return { lines, targets };
}

/** The bulk price preview and apply routes, and the price resolver. */
export const pricingRoutes: HttpHandler[] = [
  http.post('*/admin/services/bulk-price/preview', ({ request }) =>
    signedIn(request, async () => {
      const result = plan(await servicesStore(), await bodyOf(request));
      if (result instanceof Response) return result;
      return HttpResponse.json({
        lines: result.lines,
        belowFloor: result.lines.filter((line) => line.belowFloor).length,
      });
    }),
  ),

  http.post('*/admin/services/bulk-price/apply', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const result = plan(stores, await bodyOf(request));
      if (result instanceof Response) return result;
      for (const { row, price } of result.targets) stores.services.patch(row.id, { price });
      return HttpResponse.json({
        updated: result.targets.length,
        belowFloor: result.lines.filter((line) => line.belowFloor).length,
      });
    }),
  ),

  http.get('*/admin/pricing/resolve', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const query = new URL(request.url).searchParams;
      const serviceId = idOf(query.get('serviceId'));
      const clientId = idOf(query.get('clientId'));
      if (serviceId === null || clientId === null) {
        return invalid([
          { field: serviceId === null ? 'serviceId' : 'clientId', message: 'This is required.' },
        ]);
      }
      const service = stores.services.find(serviceId);
      if (!service) return notFound('service', serviceId);
      const merchant = stores.merchants.get(clientId);
      if (!merchant) return notFound('merchant', clientId);
      return HttpResponse.json(resolve(stores, service, merchant));
    }),
  ),
];

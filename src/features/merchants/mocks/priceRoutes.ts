// Mock of the client price routes (`/admin/client-prices`): a merchant's fixed prices with their service and group price, create,
// change and delete. The mock refuses a price below the service's floor (the demo's check) and a second price for the same
// service, so the dialog has a server answer to show under the price. The real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { problem } from '@/mocks/problem';
import { toIso, toMoney } from '@/mocks/seed';
import { floorOf, toPrice } from './dto';
import { bodyOf, idOf, invalid, listResponse, noContent, notFound, route, textOf } from './shared';
import { merchantStore, type MerchantStore } from './store';

// The demo's wording for a price under the floor, or null when the price is fine.
function belowFloor(store: MerchantStore, serviceId: number, price: number): string | null {
  const service = store.services.get(serviceId);
  if (!service) return null;
  const floor = floorOf(service);
  return price < floor
    ? `Below the floor of ${money(floor)} (cost ${money(service.cost)} plus ${money(service.minProfit)} minimum profit).`
    : null;
}

export const priceRoutes: HttpHandler[] = [
  route('get', '/admin/client-prices', async ({ request }) => {
    const store = await merchantStore();
    return listResponse(
      store.prices.list().map((row) => toPrice(row, store)),
      request,
    );
  }),

  route('post', '/admin/client-prices', async ({ request }) => {
    const store = await merchantStore();
    const body = await bodyOf(request);
    const clientId = Number(body.clientId);
    const serviceId = Number(body.serviceId);
    const price = Number(body.price);
    if (!store.clients.find(clientId)) return notFound('merchant', body.clientId);
    if (!store.services.has(serviceId))
      return invalid([{ field: 'serviceId', message: 'That service does not exist.' }]);
    if (!Number.isFinite(price) || price <= 0) {
      return invalid([{ field: 'price', message: 'Enter a price greater than zero.' }]);
    }
    const tooLow = belowFloor(store, serviceId, price);
    if (tooLow) return invalid([{ field: 'price', message: tooLow }]);
    if (store.prices.list().some((row) => row.clientId === clientId && row.serviceId === serviceId)) {
      return problem(
        409,
        'PRICE_EXISTS',
        'Already priced',
        'This merchant already has a fixed price for that service.',
      );
    }
    const row = store.prices.insert({
      serviceId,
      clientId,
      price: toMoney(price),
      note: textOf(body.note),
      createdAt: toIso(Date.now()),
    });
    return HttpResponse.json(toPrice(row, store), { status: 201 });
  }),

  route('patch', '/admin/client-prices/:id', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    const current = store.prices.find(id);
    if (!current) return notFound('price', call.params.id);
    const body = await bodyOf(call.request);
    const changes: { price?: string; note?: string } = {};
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return invalid([{ field: 'price', message: 'Enter a price greater than zero.' }]);
      }
      const tooLow = belowFloor(store, current.serviceId, price);
      if (tooLow) return invalid([{ field: 'price', message: tooLow }]);
      changes.price = toMoney(price);
    }
    if (typeof body.note === 'string') changes.note = body.note.trim();
    const row = store.prices.patch(id, changes);
    return row ? HttpResponse.json(toPrice(row, store)) : notFound('price', id);
  }),

  route('delete', '/admin/client-prices/:id', async (call) => {
    const store = await merchantStore();
    return store.prices.remove(idOf(call)) ? noContent() : notFound('price', call.params.id);
  }),
];

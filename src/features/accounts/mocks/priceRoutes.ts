// Mock of the client price routes (`/admin/client-prices`): an account's fixed prices with their service and rank price, create, change and
// delete. The mock refuses a price below the service's floor (the demo's check), a second price for the same service and an account of
// the retail rank (`retail_rank`), so the dialog has a server answer to show under the price. The real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { problem } from '@/mocks/problem';
import { toIso, toMoney } from '@/mocks/seed';
import { context, rankOf, type Context } from './context';
import { floorOf, toPrice } from './dto';
import { bodyOf, coded, idOf, invalid, listResponse, noContent, notFound, route, textOf } from './shared';

// The demo's wording for a price under the floor, or null when the price is fine.
function belowFloor(ctx: Context, serviceId: number, price: number): string | null {
  const service = ctx.state.services.get(serviceId);
  if (!service) return null;
  const floor = floorOf(service);
  return price < floor
    ? `Below the floor of ${money(floor)} (cost ${money(service.cost)} plus ${money(service.minProfit)} minimum profit).`
    : null;
}

export const priceRoutes: HttpHandler[] = [
  route('get', '/admin/client-prices', async ({ request }) => {
    const ctx = await context();
    return listResponse(
      ctx.state.prices.list().map((row) => toPrice(ctx, row)),
      request,
    );
  }),

  route('post', '/admin/client-prices', async ({ request }) => {
    const ctx = await context();
    const body = await bodyOf(request);
    const clientId = Number(body.clientId);
    const serviceId = Number(body.serviceId);
    const price = Number(body.price);
    const account = ctx.state.accounts.find(clientId);
    if (!account) return notFound('account', body.clientId);
    if (rankOf(ctx, account).rankKind !== 'merchant') {
      return invalid([coded('clientId', 'retail_rank', 'A retail account has no fixed prices.')]);
    }
    if (!ctx.state.services.has(serviceId)) {
      return invalid([{ field: 'serviceId', message: 'That service does not exist.' }]);
    }
    if (!Number.isFinite(price) || price <= 0) {
      return invalid([{ field: 'price', message: 'Enter a price greater than zero.' }]);
    }
    const tooLow = belowFloor(ctx, serviceId, price);
    if (tooLow) return invalid([{ field: 'price', message: tooLow }]);
    if (ctx.state.prices.list().some((row) => row.clientId === clientId && row.serviceId === serviceId)) {
      return problem(
        409,
        'PRICE_EXISTS',
        'Already priced',
        'This account already has a fixed price for that service.',
      );
    }
    const row = ctx.state.prices.insert({
      serviceId,
      clientId,
      price: toMoney(price),
      note: textOf(body.note),
      createdAt: toIso(Date.now()),
    });
    return HttpResponse.json(toPrice(ctx, row), { status: 201 });
  }),

  route('patch', '/admin/client-prices/:id', async (call) => {
    const ctx = await context();
    const id = idOf(call);
    const current = ctx.state.prices.find(id);
    if (!current) return notFound('price', call.params.id);
    const body = await bodyOf(call.request);
    const changes: { price?: string; note?: string } = {};
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return invalid([{ field: 'price', message: 'Enter a price greater than zero.' }]);
      }
      const tooLow = belowFloor(ctx, current.serviceId, price);
      if (tooLow) return invalid([{ field: 'price', message: tooLow }]);
      changes.price = toMoney(price);
    }
    if (typeof body.note === 'string') changes.note = body.note.trim();
    const row = ctx.state.prices.patch(id, changes);
    return row ? HttpResponse.json(toPrice(ctx, row)) : notFound('price', id);
  }),

  route('delete', '/admin/client-prices/:id', async (call) => {
    const { state } = await context();
    return state.prices.remove(idOf(call)) ? noContent() : notFound('price', call.params.id);
  }),
];

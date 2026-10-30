// Mock routes of a supplier's service list and of the work done with it: `GET /admin/suppliers/:id/services`, the import preview,
// the import, and `PUT /admin/services/:id/supplier-links`. The classification (new, matching, changed) and the suggested price
// are plain fakes; the real server decides both (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { invalid, notFound } from '@/mocks/handlers/accessShared';
import { toMoney } from '@/mocks/seed';
import { chainOf, type MockItem, type SuppliersState } from './seed';
import { secured } from './secured';
import type { ImportItemState, ImportPreviewItem } from '../types';

/** The mock's price rule for a new service: cost plus 60%. */
const suggestedPrice = (credit: string): string => toMoney(Number(credit) * 1.6);

const idsOf = (body: Record<string, unknown>): number[] =>
  Array.isArray(body.supplierServiceIds) ? body.supplierServiceIds.map(Number).filter(Number.isFinite) : [];

function stateOf(item: MockItem): ImportItemState {
  if (!item.imported) return 'new';
  return item.previousCredit === null ? 'matching' : 'changed';
}

function previewOf(data: SuppliersState, item: MockItem): ImportPreviewItem {
  const state = stateOf(item);
  const service = item.linkedServiceId === null ? undefined : data.services.find(item.linkedServiceId);
  return {
    supplierServiceId: item.id,
    name: item.name,
    type: item.type,
    state,
    serviceId: service?.id ?? null,
    serviceName: service?.name ?? null,
    cost: item.credit,
    previousCost: item.previousCredit,
    suggestedPrice: state === 'matching' ? null : suggestedPrice(item.credit),
  };
}

// The picked items of one supplier; ids of another supplier's services are ignored.
function pickedItems(data: SuppliersState, supplierId: number, body: Record<string, unknown>): MockItem[] {
  return idsOf(body).flatMap((id) => {
    const item = data.catalogue.find(id);
    return item && item.supplierId === supplierId ? [item] : [];
  });
}

/** The routes for a supplier's service list, the import and the links of a service. */
export const catalogueHandlers: HttpHandler[] = [
  http.get(
    '*/admin/suppliers/:id/services',
    secured(({ request, params, data }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      // `previousCredit` is the mock's own bookkeeping, not part of the list's rows.
      const rows = data.catalogue
        .list()
        .filter((item) => item.supplierId === supplier.id)
        .map(({ previousCredit: _previous, ...item }) => item);
      const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, [
        'name',
        'remoteGroup',
        'remoteId',
      ]);
      return HttpResponse.json(page, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  ),

  http.post(
    '*/admin/suppliers/:id/import/preview',
    secured(async ({ params, data, body }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      const items = pickedItems(data, supplier.id, await body());
      if (items.length === 0)
        return invalid([{ field: 'supplierServiceIds', message: 'Pick at least one service.' }]);
      return HttpResponse.json({ items: items.map((item) => previewOf(data, item)) });
    }),
  ),

  http.post(
    '*/admin/suppliers/:id/import',
    secured(async ({ params, data, body }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      const items = pickedItems(data, supplier.id, await body());
      if (items.length === 0)
        return invalid([{ field: 'supplierServiceIds', message: 'Pick at least one service.' }]);
      const result = { created: 0, updated: 0, unchanged: 0 };
      for (const item of items) {
        const state = stateOf(item);
        if (state === 'matching') result.unchanged += 1;
        else if (state === 'changed') {
          data.services.patch(item.linkedServiceId as number, { cost: item.credit });
          item.previousCredit = null;
          item.priceChangedAt = null;
          result.updated += 1;
        } else {
          const service = data.services.insert({
            name: item.name,
            code: `IMP-${item.id}`,
            status: 'active',
            slaMinutes: 60,
            cost: item.credit,
          });
          data.links.push({ serviceId: service.id, supplierServiceId: item.id, priority: 1 });
          item.imported = true;
          item.linkedServiceId = service.id;
          result.created += 1;
        }
      }
      return HttpResponse.json(result);
    }),
  ),

  http.put(
    '*/admin/services/:id/supplier-links',
    secured(async ({ params, data, body }) => {
      const service = data.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const input = await body();
      const wanted = (Array.isArray(input.links) ? input.links : []) as {
        supplierServiceId?: number;
        priority?: number;
      }[];
      const items = wanted.map((link) => data.catalogue.find(Number(link.supplierServiceId)));
      if (items.some((item) => !item)) {
        return invalid([{ field: 'links', message: 'Choose a service of the supplier for every link.' }]);
      }
      const order = wanted
        .map((link, index) => ({
          id: Number(link.supplierServiceId),
          priority: Number(link.priority ?? index + 1),
        }))
        .sort((a, b) => a.priority - b.priority);
      const before = data.links.filter((link) => link.serviceId === service.id);
      data.links = data.links.filter((link) => link.serviceId !== service.id);
      order.forEach((link, index) =>
        data.links.push({ serviceId: service.id, supplierServiceId: link.id, priority: index + 1 }),
      );
      // A supplier service that no service uses any more counts as not imported.
      for (const old of before) {
        const stillUsed = data.links.some((link) => link.supplierServiceId === old.supplierServiceId);
        const item = data.catalogue.find(old.supplierServiceId);
        if (item && !stillUsed) Object.assign(item, { imported: false, linkedServiceId: null });
      }
      for (const link of order)
        Object.assign(data.catalogue.find(link.id) as MockItem, {
          imported: true,
          linkedServiceId: service.id,
        });
      return HttpResponse.json(chainOf(data, service.id));
    }),
  ),
];

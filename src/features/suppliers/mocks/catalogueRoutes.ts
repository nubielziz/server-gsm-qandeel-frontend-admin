// Mock routes of a supplier's service list and of the work done with it: `GET /admin/suppliers/:id/services` (at most 1000 rows per
// call), the import preview and the import (at most 500 ids per call, as the real server: a longer request is refused), and
// `GET` and `PUT /admin/services/:id/supplier-links`. The classification and the suggested price are plain fakes (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { servicesStore } from '@/features/services/mocks/store';
import { applyListQuery } from '@/mocks/crud';
import { invalid, notFound } from '@/mocks/handlers/accessShared';
import { toMoney } from '@/mocks/seed';
import { chainOf, type MockItem, type MockService, type SuppliersState } from './seed';
import type { MockQuantity } from './seedTypes';
import { secured } from './secured';
import type { ImportItemState, ImportPreviewItem, ImportServiceStatus } from '../types';

/** The mock's price rule for a new service: cost plus 60%. */
const suggestedPrice = (credit: string): string => toMoney(Number(credit) * 1.6);

/** The most rows one call of the service list sends. */
const LIST_PAGE_CAP = 1000;
/** The most ids one call of the preview or of the import takes. */
const IMPORT_BATCH_CAP = 500;

const tooManyIds = () =>
  invalid([
    {
      field: 'supplierServiceIds',
      message: `Send at most ${IMPORT_BATCH_CAP} services in one call.`,
    },
  ]);

const idsOf = (body: Record<string, unknown>): number[] =>
  Array.isArray(body.supplierServiceIds) ? body.supplierServiceIds.map(Number).filter(Number.isFinite) : [];

/** The optional keys of the import and its preview (decision 063); `given` says whether either was sent, which adds the preview's two keys. */
type ImportOptions = { status: ImportServiceStatus; categoryId: number | null; given: boolean };

/** The most services a refusal on `categoryId` names, as the real server does (then a count). */
const NAMED_MOST = 10;

/** Reads `status` and `categoryId`; answers the 422 the server gives on the key that is wrong. */
function readOptions(input: Record<string, unknown>): ImportOptions | Response {
  const problems: { field: string; message: string }[] = [];
  let status: ImportServiceStatus = 'active';
  if (input.status !== undefined) {
    if (input.status === 'active' || input.status === 'disabled') status = input.status;
    else problems.push({ field: 'status', message: 'Choose active or disabled.' });
  }
  let categoryId: number | null = null;
  if (input.categoryId !== undefined) {
    const id = Number(input.categoryId);
    if (Number.isInteger(id) && id > 0) categoryId = id;
    else problems.push({ field: 'categoryId', message: 'Choose a group.' });
  }
  if (problems.length > 0) return invalid(problems);
  return { status, categoryId, given: input.status !== undefined || input.categoryId !== undefined };
}

type PickedCategory = { id: number; name: string };

/** The category the preview names for a new item: `id` is `null` when the import would make it (no category of the type has the name yet). */
type NamedCategory = { id: number | null; name: string };

/** The name a category made by an import gets when the supplier's group text is empty or nothing but separators. */
const IMPORTED_NAME = 'Imported';

// Separators a made name never starts or ends with (hyphens, dashes, slashes, bars, colons, commas, underscores, stars, tildes, `&`).
const EDGE_SEPARATORS = /^[\s\-\u2013\u2014/\\|:;,_*~&]+|[\s\-\u2013\u2014/\\|:;,_*~&]+$/g;

/**
 * The supplier's group text as a category name: spaces collapsed, separators at the ends dropped, `Imported` when nothing is left (simpler
 * than the server's cleaning, which also drops emoji, entities and other decoration).
 */
const cleanedName = (group: string): string =>
  group.replace(/\s+/g, ' ').replace(EDGE_SEPARATORS, '').trim() || IMPORTED_NAME;

/**
 * The category each new item would go into when the preview says it: the one picked, else (as the server does) the existing category of the
 * item's type whose name is the group text or its cleaned name, ignoring case, else `{ id: null, name }` with the cleaned name.
 */
async function categoriesOf(
  items: readonly MockItem[],
  picked: PickedCategory | null,
): Promise<Map<number, NamedCategory>> {
  const existing = (await servicesStore()).categories.list();
  const named = new Map<number, NamedCategory>();
  for (const item of items) {
    if (stateOf(item) !== 'new') continue;
    if (picked) {
      named.set(item.id, picked);
      continue;
    }
    const type = item.type.trim().toLowerCase();
    const cleaned = cleanedName(item.remoteGroup);
    const wanted = [item.remoteGroup.trim() || IMPORTED_NAME, cleaned].map((name) => name.toLowerCase());
    const found = wanted
      .map((name) =>
        existing.find((category) => category.type === type && category.name.toLowerCase() === name),
      )
      .find((category) => category !== undefined);
    named.set(item.id, found ? { id: found.id, name: found.name } : { id: null, name: cleaned });
  }
  return named;
}

/**
 * The category every new service goes into, or the refusal: an unknown id is a 422 on `categoryId`, and so is a category of another
 * type than a new service becomes (the mock reads the type as the supplier states it), naming ten services at most, with nothing imported.
 */
async function pickedCategory(
  options: ImportOptions,
  items: readonly MockItem[],
): Promise<PickedCategory | null | Response> {
  if (options.categoryId === null) return null;
  const category = (await servicesStore()).categories.find(options.categoryId);
  if (!category) return invalid([{ field: 'categoryId', message: 'That group does not exist.' }]);
  const misfits = items.filter(
    (item) => stateOf(item) === 'new' && item.type.trim().toLowerCase() !== category.type,
  );
  if (misfits.length === 0) return { id: category.id, name: category.name };
  const names = misfits.slice(0, NAMED_MOST).map((item) => item.name);
  const more = misfits.length > NAMED_MOST ? ` and ${misfits.length - NAMED_MOST} more` : '';
  return invalid([
    {
      field: 'categoryId',
      message: `The group ${category.name} is for ${category.type} services. These do not fit: ${names.join(', ')}${more}.`,
    },
  ]);
}
function stateOf(item: MockItem): ImportItemState {
  if (!item.imported) return 'new';
  return item.previousCredit === null ? 'matching' : 'changed';
}

// The rule the supplier states for an item; one per order when it states none.
const quantityOf = (item: MockItem): MockQuantity =>
  item.quantity ?? { minQty: 1, maxQty: 1, qtyOptions: [] };

const sameQuantity = (a: MockQuantity, b: MockQuantity): boolean =>
  a.minQty === b.minQty && a.maxQty === b.maxQty && a.qtyOptions.join(',') === b.qtyOptions.join(',');

/**
 * Creates the console service for a supplier item that is not imported yet, links it as the primary supplier and marks the item
 * imported. The import and Quick add share it, so both name, price and number a new service the same way.
 */
export function createFromItem(
  data: SuppliersState,
  item: MockItem,
  status = 'active',
  categoryId?: number,
): MockService {
  const service = data.services.insert({
    name: item.name,
    code: `IMP-${item.id}`,
    status,
    slaMinutes: 60,
    cost: item.credit,
    ...(categoryId === undefined ? {} : { categoryId }),
    // A new service gets the supplier's rule; a later import never changes it.
    ...quantityOf(item),
  });
  data.links.push({ serviceId: service.id, supplierServiceId: item.id, priority: 1 });
  item.imported = true;
  item.linkedServiceId = service.id;
  return service;
}

function previewOf(
  data: SuppliersState,
  item: MockItem,
  options?: ImportOptions,
  category?: NamedCategory | null,
): ImportPreviewItem {
  const state = stateOf(item);
  const service = item.linkedServiceId === null ? undefined : data.services.find(item.linkedServiceId);
  const rule = quantityOf(item);
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
    ...rule,
    // A linked service keeps its own rule; the preview only says when it is another one.
    quantityDiffers: state !== 'new' && service !== undefined && !sameQuantity(service, rule),
    // With either key sent the item also says what a new service would become (decision 063); without them the item is as it was.
    ...(options?.given
      ? {
          status: state === 'new' ? options.status : null,
          category: state === 'new' ? (category ?? null) : null,
        }
      : {}),
  };
}

// The picked items of one supplier; ids of another supplier's services are ignored.
function pickedItems(data: SuppliersState, supplierId: number, body: Record<string, unknown>): MockItem[] {
  return idsOf(body).flatMap((id) => {
    const item = data.catalogue.find(id);
    return item && item.supplierId === supplierId ? [item] : [];
  });
}

/**
 * The id of a service in a links address, or `null` for text that is no service id. A service the services mock made (New service) is
 * not in this feature's table, but it is a service all the same: it has no links yet, so its chain is empty.
 */
function serviceIdOf(param: string | readonly string[] | undefined): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
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
        .map(({ previousCredit: _previous, quantity: _quantity, ...item }) => item);
      const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, [
        'name',
        'remoteGroup',
        'remoteId',
      ]);
      return HttpResponse.json(page.slice(0, LIST_PAGE_CAP), {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  ),

  http.post(
    '*/admin/suppliers/:id/import/preview',
    secured(async ({ params, data, body }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      const input = await body();
      if (idsOf(input).length > IMPORT_BATCH_CAP) return tooManyIds();
      const options = readOptions(input);
      if (options instanceof Response) return options;
      const items = pickedItems(data, supplier.id, input);
      if (items.length === 0)
        return invalid([{ field: 'supplierServiceIds', message: 'Pick at least one service.' }]);
      const picked = await pickedCategory(options, items);
      if (picked instanceof Response) return picked;
      // With either key sent, every new item names the group it would go into (the picked one, else the one the import would use).
      const named = options.given ? await categoriesOf(items, picked) : null;
      return HttpResponse.json({
        items: items.map((item) => previewOf(data, item, options, named?.get(item.id))),
      });
    }),
  ),

  http.post(
    '*/admin/suppliers/:id/import',
    secured(async ({ params, data, body }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      const input = await body();
      if (idsOf(input).length > IMPORT_BATCH_CAP) return tooManyIds();
      const options = readOptions(input);
      if (options instanceof Response) return options;
      const items = pickedItems(data, supplier.id, input);
      if (items.length === 0)
        return invalid([{ field: 'supplierServiceIds', message: 'Pick at least one service.' }]);
      // A refused category imports nothing: it is checked before the first service is made.
      const category = await pickedCategory(options, items);
      if (category instanceof Response) return category;
      const result = { created: 0, updated: 0, unchanged: 0 };
      // The services this call made (not the ones it updated), in the order they were made, as the server answers.
      const createdServiceIds: number[] = [];
      for (const item of items) {
        const state = stateOf(item);
        if (state === 'matching') result.unchanged += 1;
        else if (state === 'changed') {
          data.services.patch(item.linkedServiceId as number, { cost: item.credit });
          item.previousCredit = null;
          item.priceChangedAt = null;
          result.updated += 1;
        } else {
          createdServiceIds.push(createFromItem(data, item, options.status, category?.id).id);
          result.created += 1;
        }
      }
      return HttpResponse.json({ ...result, createdServiceIds });
    }),
  ),

  http.get(
    '*/admin/services/:id/supplier-links',
    secured(({ params, data }) => {
      const serviceId = serviceIdOf(params.id);
      if (serviceId === null) return notFound('service', params.id);
      return HttpResponse.json(chainOf(data, serviceId));
    }),
  ),

  http.put(
    '*/admin/services/:id/supplier-links',
    secured(async ({ params, data, body }) => {
      const serviceId = serviceIdOf(params.id);
      if (serviceId === null) return notFound('service', params.id);
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
      const before = data.links.filter((link) => link.serviceId === serviceId);
      data.links = data.links.filter((link) => link.serviceId !== serviceId);
      order.forEach((link, index) =>
        data.links.push({ serviceId, supplierServiceId: link.id, priority: index + 1 }),
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
          linkedServiceId: serviceId,
        });
      return HttpResponse.json(chainOf(data, serviceId));
    }),
  ),
];

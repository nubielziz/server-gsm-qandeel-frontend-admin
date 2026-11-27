// Mock of the category routes (`/admin/service-categories*`). The mock refuses to delete a category that services still use, and stores the
// order of groups all or none with the words of the backend's contract (`POST /admin/service-categories/order`, decision 078). The merchant
// group list the pricing screens read (`GET /admin/client-groups`) is not served here: the accounts feature owns that route.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { covers, sessionPermissions } from './access';
import { toCategory } from './dto';
import { bodyOf, conflict, idOf, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { servicesStore } from './store';
import type { MockCategory } from './types';

const TYPES = ['imei', 'server', 'remote', 'file'];
const MAX_ORDER_ITEMS = 500;
const MAX_SORT = 1_000_000;

/** Applies the fields of a body to a category, collecting the problems. */
function applyFields(
  row: MockCategory,
  body: Record<string, unknown>,
  problems: { field: string; message: string }[],
): MockCategory {
  const draft = { ...row };
  if ('name' in body) {
    draft.name = textOf(body.name);
    if (!draft.name) problems.push({ field: 'name', message: 'Enter a name.' });
  }
  if ('type' in body) {
    if (typeof body.type === 'string' && TYPES.includes(body.type))
      draft.type = body.type as MockCategory['type'];
    else problems.push({ field: 'type', message: 'Choose a type.' });
  }
  if ('sort' in body) {
    const sort = Number(body.sort);
    if (Number.isInteger(sort) && sort >= 0) draft.sort = sort;
    else problems.push({ field: 'sort', message: 'Enter a whole number.' });
  }
  if ('isActive' in body) draft.isActive = body.isActive === true;
  if ('allowedGroupIds' in body) {
    // The accounts feature owns the groups, so any positive whole number is taken as a group.
    const ids = Array.isArray(body.allowedGroupIds) ? body.allowedGroupIds.map(Number) : [];
    if (ids.every((id) => Number.isInteger(id) && id > 0)) draft.allowedGroupIds = ids;
    else problems.push({ field: 'allowedGroupIds', message: 'Choose ranks.' });
  }
  return draft;
}

/** The category routes. */
export const categoryRoutes: HttpHandler[] = [
  http.get('*/admin/service-categories', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      return listAnswer(
        stores.categories.list().map((row) => toCategory(stores, row)),
        request,
        ['name'],
      );
    }),
  ),

  // The order of groups: 1 to 500 groups, all saved or none. A group listed twice or unknown is a 422 on `items.N.id`, a bad position a 422 on
  // `items.N.sort`; every problem comes back together. The answer counts the groups that changed position.
  http.post('*/admin/service-categories/order', ({ request }) =>
    signedIn(request, async () => {
      if (!covers(await sessionPermissions(), 'catalog:update')) {
        return problem(
          403,
          'FORBIDDEN',
          'Forbidden',
          'You need the catalog:update permission to change the order of groups.',
        );
      }
      const stores = await servicesStore();
      const body = await bodyOf(request);
      const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
      if (items.length < 1) return invalid([{ field: 'items', message: 'Send at least one category.' }]);
      if (items.length > MAX_ORDER_ITEMS) {
        return invalid([
          { field: 'items', message: `Send at most ${MAX_ORDER_ITEMS} categories at a time.` },
        ]);
      }
      const problems: { field: string; message: string }[] = [];
      const seen = new Set<number>();
      const parsed = items.map((item, index) => {
        const id = idOf(item.id);
        const sort = typeof item.sort === 'number' ? item.sort : Number.NaN;
        if (id !== null && seen.has(id)) {
          problems.push({ field: `items.${index}.id`, message: 'This category is listed twice.' });
        } else if (id === null || !stores.categories.find(id)) {
          problems.push({
            field: `items.${index}.id`,
            message: `No category has the id ${String(item.id)}.`,
          });
        }
        if (id !== null) seen.add(id);
        const refusal = !Number.isInteger(sort)
          ? 'Enter a whole number.'
          : sort < 0
            ? 'Enter 0 or more.'
            : sort > MAX_SORT
              ? `Use at most ${MAX_SORT}.`
              : null;
        if (refusal) problems.push({ field: `items.${index}.sort`, message: refusal });
        return { id: id ?? 0, sort };
      });
      if (problems.length > 0) return invalid(problems);
      let updated = 0;
      for (const { id, sort } of parsed) {
        const row = stores.categories.find(id);
        if (!row || row.sort === sort) continue;
        stores.categories.patch(id, { sort });
        updated += 1;
      }
      return HttpResponse.json({ updated });
    }),
  ),

  http.get('*/admin/service-categories/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.categories.find(String(params.id));
      return row ? HttpResponse.json(toCategory(stores, row)) : notFound('category', params.id);
    }),
  ),

  http.post('*/admin/service-categories', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const body = await bodyOf(request);
      const problems: { field: string; message: string }[] = [];
      const draft = applyFields(
        { id: 0, name: '', type: 'imei', allowedGroupIds: [], sort: 0, isActive: true },
        body,
        problems,
      );
      if (!('name' in body)) problems.push({ field: 'name', message: 'Enter a name.' });
      if (problems.length > 0) return invalid(problems);
      // A position left out puts the new group last, as the server does.
      if (!('sort' in body))
        draft.sort = stores.categories.list().reduce((last, row) => Math.max(last, row.sort), -1) + 1;
      const { id: _id, ...fields } = draft;
      return HttpResponse.json(toCategory(stores, stores.categories.insert(fields)), { status: 201 });
    }),
  ),

  http.patch('*/admin/service-categories/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.categories.find(String(params.id));
      if (!row) return notFound('category', params.id);
      const problems: { field: string; message: string }[] = [];
      const draft = applyFields(row, await bodyOf(request), problems);
      if (problems.length > 0) return invalid(problems);
      const { id: _id, ...changes } = draft;
      return HttpResponse.json(toCategory(stores, stores.categories.patch(row.id, changes) ?? row));
    }),
  ),

  http.delete('*/admin/service-categories/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.categories.find(String(params.id));
      if (!row) return notFound('category', params.id);
      const used = stores.services.list().filter((service) => service.categoryId === row.id).length;
      if (used > 0) {
        return conflict(
          'CATEGORY_IN_USE',
          'Category in use',
          `${row.name} still has ${used} ${used === 1 ? 'service' : 'services'}. Move them to another category first.`,
        );
      }
      stores.categories.remove(row.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

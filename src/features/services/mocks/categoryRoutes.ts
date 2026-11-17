// Mock of the category routes (`/admin/service-categories*`). The mock refuses to delete a category that services still use. The merchant
// group list the pricing screens read (`GET /admin/client-groups`) is not served here: the merchants feature owns that route.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toCategory } from './dto';
import { bodyOf, conflict, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { servicesStore } from './store';
import type { MockCategory } from './types';

const TYPES = ['imei', 'server', 'remote', 'file'];

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
    // The merchants feature owns the groups, so any positive whole number is taken as a group.
    const ids = Array.isArray(body.allowedGroupIds) ? body.allowedGroupIds.map(Number) : [];
    if (ids.every((id) => Number.isInteger(id) && id > 0)) draft.allowedGroupIds = ids;
    else problems.push({ field: 'allowedGroupIds', message: 'Choose merchant groups.' });
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

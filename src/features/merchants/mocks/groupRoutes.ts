// Mock of the merchant group routes (`/admin/client-groups`): list with the number of merchants in each, one group, create, change
// and delete. The mock refuses a duplicate name and the deletion of a group that still has merchants, so the dialogs have a server
// answer to show. Only one group is the default at a time. The real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import type { ClientGroup } from '../types';
import { toGroup } from './dto';
import { bodyOf, idOf, invalid, listResponse, noContent, notFound, route, textOf } from './shared';
import { merchantStore, type MerchantStore } from './store';

// The editable fields of a group, read from a body; a field that is missing or unreadable is left out.
function fieldsOf(body: Record<string, unknown>): Partial<ClientGroup> {
  const fields: Partial<ClientGroup> = {};
  const name = textOf(body.name);
  if (name) fields.name = name;
  for (const key of ['discountPercent', 'earnThreshold', 'depositLimit'] as const) {
    if (typeof body[key] === 'string' && body[key] !== '') fields[key] = body[key];
  }
  if (typeof body.overdraftAllowed === 'boolean') fields.overdraftAllowed = body.overdraftAllowed;
  if (typeof body.isDefault === 'boolean') fields.isDefault = body.isDefault;
  return fields;
}

// Making a group the default takes the mark off the others.
function keepOneDefault(store: MerchantStore, group: ClientGroup): void {
  if (!group.isDefault) return;
  for (const other of store.groups.list()) {
    if (other.id !== group.id && other.isDefault) store.groups.patch(other.id, { isDefault: false });
  }
}

const nameTaken = (store: MerchantStore, name: string, except?: number) =>
  store.groups.list().some((group) => group.id !== except && group.name.toLowerCase() === name.toLowerCase());

export const groupRoutes: HttpHandler[] = [
  route('get', '/admin/client-groups', async ({ request }) => {
    const store = await merchantStore();
    return listResponse(
      store.groups.list().map((group) => toGroup(group, store)),
      request,
      ['name'],
    );
  }),

  route('get', '/admin/client-groups/:id', async (call) => {
    const store = await merchantStore();
    const group = store.groups.find(idOf(call));
    return group ? HttpResponse.json(toGroup(group, store)) : notFound('group', call.params.id);
  }),

  route('post', '/admin/client-groups', async ({ request }) => {
    const store = await merchantStore();
    const fields = fieldsOf(await bodyOf(request));
    if (!fields.name) return invalid([{ field: 'name', message: 'Enter a group name.' }]);
    if (nameTaken(store, fields.name)) {
      return invalid([{ field: 'name', message: 'A group with this name already exists.' }]);
    }
    const group = store.groups.insert({
      kind: 'b2b',
      discountPercent: '0.0000',
      isDefault: false,
      earnThreshold: '0.0000',
      depositLimit: '0.0000',
      overdraftAllowed: false,
      sort: store.groups.size + 1,
      createdAt: toIso(Date.now()),
      ...fields,
      name: fields.name,
    });
    keepOneDefault(store, group);
    return HttpResponse.json(toGroup(group, store), { status: 201 });
  }),

  route('patch', '/admin/client-groups/:id', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    const fields = fieldsOf(await bodyOf(call.request));
    if (fields.name && nameTaken(store, fields.name, id)) {
      return invalid([{ field: 'name', message: 'A group with this name already exists.' }]);
    }
    const group = store.groups.patch(id, fields);
    if (!group) return notFound('group', call.params.id);
    keepOneDefault(store, group);
    return HttpResponse.json(toGroup(group, store));
  }),

  route('delete', '/admin/client-groups/:id', async (call) => {
    const store = await merchantStore();
    const group = store.groups.find(idOf(call));
    if (!group) return notFound('group', call.params.id);
    const inside = store.clients.list().filter((client) => client.groupId === group.id).length;
    if (inside > 0) {
      return problem(
        409,
        'GROUP_IN_USE',
        'The group still has merchants',
        `Move the ${inside} ${inside === 1 ? 'merchant' : 'merchants'} in ${group.name} to another group first.`,
      );
    }
    store.groups.remove(group.id);
    return noContent();
  }),
];

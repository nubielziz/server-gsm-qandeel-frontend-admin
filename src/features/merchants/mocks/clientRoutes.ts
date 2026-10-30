// Mock of the merchant account routes (`/admin/clients`, `/admin/clients/:id`): the list with its status, group and `q` filters,
// one merchant, an invitation and a change of status or group. The mock refuses what the demo refused (an unknown group) and a
// duplicate email, so the dialogs have a server answer to show. Business rules are the real server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import type { ClientStatus } from '../types';
import { toClient } from './dto';
import { bodyOf, idOf, invalid, listResponse, notFound, route, textOf } from './shared';
import { merchantStore, type MockClient } from './store';

const SEARCH_FIELDS = ['name', 'email', 'company', 'country', 'username'];
const STATUSES: readonly string[] = ['active', 'pending', 'suspended'];

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const clientRoutes: HttpHandler[] = [
  route('get', '/admin/clients', async ({ request }) => {
    const store = await merchantStore();
    return listResponse(
      store.clients.list().map((row) => toClient(row, store)),
      request,
      SEARCH_FIELDS,
    );
  }),

  route('get', '/admin/clients/:id', async (call) => {
    const store = await merchantStore();
    const row = store.clients.find(idOf(call));
    return row ? HttpResponse.json(toClient(row, store)) : notFound('merchant', call.params.id);
  }),

  // An invitation: the account starts pending and the server would email the sign-up link.
  route('post', '/admin/clients', async ({ request }) => {
    const store = await merchantStore();
    const body = await bodyOf(request);
    const name = textOf(body.name);
    const email = textOf(body.email).toLowerCase();
    const country = textOf(body.country).toUpperCase();
    const errors = [
      ...(name ? [] : [{ field: 'name', message: 'Enter the business name.' }]),
      ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
        ? []
        : [{ field: 'email', message: 'Enter a valid email address.' }]),
      ...(/^[A-Z]{2}$/.test(country)
        ? []
        : [{ field: 'country', message: 'Enter the two-letter country code.' }]),
    ];
    if (errors.length > 0) return invalid(errors);
    if (store.clients.list().some((client) => client.email.toLowerCase() === email)) {
      return problem(
        409,
        'EMAIL_TAKEN',
        'Email already registered',
        `A merchant with ${email} already exists.`,
      );
    }
    const groupId =
      typeof body.groupId === 'number'
        ? body.groupId
        : (store.groups.list().find((g) => g.isDefault)?.id ?? 1);
    const row: MockClient = store.clients.insert({
      username: slug(name),
      email,
      name,
      company: name,
      phone: '',
      country,
      groupId,
      status: 'pending',
      kycStatus: 'none',
      referredById: null,
      referralCode: `GSM${Date.now().toString(36).toUpperCase()}`,
      emailVerifiedAt: null,
      createdAt: toIso(Date.now()),
      balance: 0,
      reserved: 0,
      creditLimit: Number(body.creditLimit ?? 0) || 0,
      stats: {
        orders: 0,
        spend: '0.0000',
        profit: '0.0000',
        margin: null,
        successRate: null,
        lastOrderAt: null,
      },
    });
    return HttpResponse.json(toClient(row, store), { status: 201 });
  }),

  route('patch', '/admin/clients/:id', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    if (!store.clients.find(id)) return notFound('merchant', call.params.id);
    const body = await bodyOf(call.request);
    const changes: Partial<MockClient> = {};
    if (body.groupId !== undefined) {
      const group = store.groups.find(Number(body.groupId));
      if (!group) return invalid([{ field: 'groupId', message: 'That group does not exist.' }]);
      changes.groupId = group.id;
    }
    if (typeof body.status === 'string' && STATUSES.includes(body.status)) {
      changes.status = body.status as ClientStatus;
    }
    const row = store.clients.patch(id, changes);
    return row ? HttpResponse.json(toClient(row, store)) : notFound('merchant', id);
  }),
];

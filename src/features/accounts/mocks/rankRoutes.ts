// Mock of the rank routes (`/admin/client-groups`): the list with the number of accounts in each (retail too), one rank, create, change and
// delete. The mock refuses a duplicate name, a retail rank that allows credit, and the deletion of a rank that still has accounts or of
// the retail rank, so the dialogs have a server answer to show. Only one merchant rank is the default at a time. The real rules are
// the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import type { Rank } from '../types';
import { context, type Context } from './context';
import { toRank } from './dto';
import { bodyOf, idOf, invalid, listResponse, noContent, notFound, route, textOf } from './shared';

// The editable fields of a rank, read from a body; a field that is missing or unreadable is left out.
function fieldsOf(body: Record<string, unknown>): Partial<Rank> {
  const fields: Partial<Rank> = {};
  const name = textOf(body.name);
  if (name) fields.name = name;
  for (const key of ['discountPercent', 'depositLimit'] as const) {
    if (typeof body[key] === 'string' && body[key] !== '') fields[key] = body[key];
  }
  if (typeof body.overdraftAllowed === 'boolean') fields.overdraftAllowed = body.overdraftAllowed;
  if (typeof body.isDefault === 'boolean') fields.isDefault = body.isDefault;
  return fields;
}

// Making a rank the default takes the mark off the others.
function keepOneDefault(ctx: Context, rank: Rank): void {
  if (!rank.isDefault) return;
  for (const other of ctx.state.ranks.list()) {
    if (other.id !== rank.id && other.isDefault) ctx.state.ranks.patch(other.id, { isDefault: false });
  }
}

const nameTaken = (ctx: Context, name: string, except?: number) =>
  ctx.state.ranks.list().some((rank) => rank.id !== except && rank.name.toLowerCase() === name.toLowerCase());

export const rankRoutes: HttpHandler[] = [
  route('get', '/admin/client-groups', async ({ request }) => {
    const ctx = await context();
    return listResponse(
      ctx.state.ranks.list().map((rank) => toRank(ctx, rank)),
      request,
      ['name'],
    );
  }),

  route('get', '/admin/client-groups/:id', async (call) => {
    const ctx = await context();
    const rank = ctx.state.ranks.find(idOf(call));
    return rank ? HttpResponse.json(toRank(ctx, rank)) : notFound('rank', call.params.id);
  }),

  route('post', '/admin/client-groups', async ({ request }) => {
    const ctx = await context();
    const fields = fieldsOf(await bodyOf(request));
    if (!fields.name) return invalid([{ field: 'name', message: 'Enter a rank name.' }]);
    if (nameTaken(ctx, fields.name)) {
      return invalid([{ field: 'name', message: 'A rank with this name already exists.' }]);
    }
    const rank = ctx.state.ranks.insert({
      kind: 'b2b',
      rankKind: 'merchant',
      discountPercent: '0.0000',
      isDefault: false,
      depositLimit: '0.0000',
      overdraftAllowed: false,
      sort: ctx.state.ranks.size + 1,
      createdAt: toIso(Date.now()),
      ...fields,
      name: fields.name,
    });
    keepOneDefault(ctx, rank);
    return HttpResponse.json(toRank(ctx, rank), { status: 201 });
  }),

  route('patch', '/admin/client-groups/:id', async (call) => {
    const ctx = await context();
    const id = idOf(call);
    const current = ctx.state.ranks.find(id);
    if (!current) return notFound('rank', call.params.id);
    const fields = fieldsOf(await bodyOf(call.request));
    if (fields.name && nameTaken(ctx, fields.name, id)) {
      return invalid([{ field: 'name', message: 'A rank with this name already exists.' }]);
    }
    if (current.rankKind === 'retail' && fields.overdraftAllowed) {
      return invalid([{ field: 'overdraftAllowed', message: 'The retail rank never allows credit.' }]);
    }
    const rank = ctx.state.ranks.patch(id, fields);
    if (!rank) return notFound('rank', call.params.id);
    keepOneDefault(ctx, rank);
    return HttpResponse.json(toRank(ctx, rank));
  }),

  route('delete', '/admin/client-groups/:id', async (call) => {
    const ctx = await context();
    const rank = ctx.state.ranks.find(idOf(call));
    if (!rank) return notFound('rank', call.params.id);
    if (rank.rankKind === 'retail') {
      return problem(409, 'CONFLICT', 'The retail rank stays', 'The retail rank cannot be deleted.');
    }
    const inside = ctx.state.accounts.list().filter((account) => account.rankId === rank.id).length;
    if (inside > 0) {
      return problem(
        409,
        'GROUP_IN_USE',
        'The rank still has accounts',
        `Move the ${inside} ${inside === 1 ? 'account' : 'accounts'} in ${rank.name} to another rank first.`,
      );
    }
    ctx.state.ranks.remove(rank.id);
    return noContent();
  }),
];

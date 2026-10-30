// Mock of the pricing rule routes (`/admin/pricing-rules*`): list, one rule, create, change and delete. The mock plays the server:
// it checks the target, the amounts, the priority and the dates, and answers with a message per field.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toRule } from './dto';
import { bodyOf, idOf, invalid, listAnswer, notFound, signedIn } from './http';
import { servicesStore } from './store';
import type { Stores } from './seed';
import type { MockRule } from './types';

type Problems = { field: string; message: string }[];

const SCOPES = ['global', 'category', 'service'];
const KINDS = ['margin', 'discount', 'promo'];
const ROUNDINGS = ['none', 'nearest_0.05', 'nearest_0.10', 'ends_99'];

/** A non-negative amount from a body field, or null when it is not one. */
const amountOf = (value: unknown): number | null => {
  const number = Number(value);
  return value !== null && value !== '' && Number.isFinite(number) && number >= 0 ? number : null;
};

/** Applies the fields of a body to a rule, collecting the problems; the caller saves nothing when there are any. */
function applyFields(
  stores: Stores,
  row: MockRule,
  body: Record<string, unknown>,
  problems: Problems,
): MockRule {
  const draft = { ...row };
  if ('scope' in body) {
    if (SCOPES.includes(String(body.scope))) draft.scope = body.scope as MockRule['scope'];
    else problems.push({ field: 'scope', message: 'Choose what the rule covers.' });
  }
  if ('targetId' in body) draft.targetId = body.targetId === null ? null : idOf(body.targetId);
  if ('groupId' in body) {
    // The merchants feature owns the groups, so any positive whole number is taken as a group.
    draft.groupId = body.groupId === null ? null : idOf(body.groupId);
    if (body.groupId !== null && draft.groupId === null) {
      problems.push({ field: 'groupId', message: 'Choose a merchant group.' });
    }
  }
  if ('kind' in body) {
    if (KINDS.includes(String(body.kind))) draft.kind = body.kind as MockRule['kind'];
    else problems.push({ field: 'kind', message: 'Choose a type.' });
  }
  for (const field of ['percent', 'fixed', 'minProfit'] as const) {
    if (!(field in body)) continue;
    const amount = amountOf(body[field]);
    if (amount === null) problems.push({ field, message: 'Enter a number, 0 or more.' });
    else draft[field] = amount;
  }
  if ('rounding' in body) {
    if (ROUNDINGS.includes(String(body.rounding))) draft.rounding = body.rounding as MockRule['rounding'];
    else problems.push({ field: 'rounding', message: 'Choose a rounding.' });
  }
  if ('priority' in body) {
    const priority = Number(body.priority);
    if (Number.isInteger(priority) && priority >= 0) draft.priority = priority;
    else problems.push({ field: 'priority', message: 'Enter a whole number.' });
  }
  if ('isActive' in body) draft.isActive = body.isActive === true;
  if ('startsAt' in body) draft.startsAt = typeof body.startsAt === 'string' ? body.startsAt : null;
  if ('endsAt' in body) draft.endsAt = typeof body.endsAt === 'string' ? body.endsAt : null;

  // The target must exist for the scope; the amounts must change something; the dates must run forwards.
  if (draft.scope === 'global') draft.targetId = null;
  else if (
    draft.targetId === null ||
    !(draft.scope === 'category' ? stores.categories : stores.services).find(draft.targetId)
  ) {
    problems.push({ field: 'targetId', message: `Choose the ${draft.scope}.` });
  }
  if (draft.percent === 0 && draft.fixed === 0) {
    problems.push({ field: 'percent', message: 'Enter a percent or a fixed amount.' });
  }
  if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) {
    problems.push({ field: 'endsAt', message: 'The end date is before the start date.' });
  }
  return draft;
}

/** The pricing rule routes. */
export const ruleRoutes: HttpHandler[] = [
  http.get('*/admin/pricing-rules', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      return listAnswer(
        stores.rules.list().map((row) => toRule(stores, row)),
        request,
        ['target.name', 'kind'],
      );
    }),
  ),

  http.get('*/admin/pricing-rules/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.rules.find(String(params.id));
      return row ? HttpResponse.json(toRule(stores, row)) : notFound('pricing rule', params.id);
    }),
  ),

  http.post('*/admin/pricing-rules', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const problems: Problems = [];
      const blank: MockRule = {
        id: 0,
        scope: 'global',
        targetId: null,
        groupId: null,
        kind: 'discount',
        percent: 0,
        fixed: 0,
        rounding: 'none',
        minProfit: 0,
        priority: 100,
        isActive: true,
        startsAt: null,
        endsAt: null,
      };
      const draft = applyFields(stores, blank, await bodyOf(request), problems);
      if (problems.length > 0) return invalid(problems);
      const { id: _id, ...fields } = draft;
      return HttpResponse.json(toRule(stores, stores.rules.insert(fields)), { status: 201 });
    }),
  ),

  http.patch('*/admin/pricing-rules/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const row = stores.rules.find(String(params.id));
      if (!row) return notFound('pricing rule', params.id);
      const problems: Problems = [];
      const draft = applyFields(stores, row, await bodyOf(request), problems);
      if (problems.length > 0) return invalid(problems);
      const { id: _id, ...changes } = draft;
      return HttpResponse.json(toRule(stores, stores.rules.patch(row.id, changes) ?? row));
    }),
  ),

  http.delete('*/admin/pricing-rules/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      if (!stores.rules.remove(String(params.id))) return notFound('pricing rule', params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

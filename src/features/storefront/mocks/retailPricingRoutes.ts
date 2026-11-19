// Mock of the Retail pricing routes (`/admin/retail-price-rules*`, `/admin/retail-price-changes*`): the rules (list, make, change,
// delete), the preview of a rule change, the price changes and the resolve of proposals. The mock plays the server for the
// refusals of the plan (a second rule for one target, a figure outside its limits, a proposal whose figure moved) and answers
// fixed figures from its seed: it works out no price (M92). Apply needs `seen`, the figure the list showed for every id (keep takes
// none); a figure that is not the proposal's answers `changed`, and so does a proposal marked `movedTo` (once), as a server would
// when the cost moved again between the list and the click.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, invalid, listAnswer, notFound, signedIn } from './http';
import { readFigures, readTarget } from './retailRuleFields';
import { ruleFor, toChange, toRule } from './pricingDto';
import { storefrontStore } from './store';
import type { FieldProblem } from './listingFields';
import type { RetailRulePreview } from '../types';
import type { MockRetailRule, Stores } from './types';

const SIGNED_IN_STAFF = 1;
const RULE_KEYS = ['percent', 'fixed', 'rounding', 'roundFrom', 'autoFollowPercent', 'isActive'];

/** The preview of a change that moves prices to and from a rule: fixed counts and the seed's lines. */
function movingPreview(stores: Stores): RetailRulePreview {
  return {
    following: 6,
    changes: 3,
    raised: 2,
    lowered: 1,
    atFloor: 1,
    noRule: 0,
    lines: [...stores.pricing.previewLines],
    truncated: false,
  };
}

/** The preview of taking a rule away (delete, turn off): its followers go to the next rule, or keep their price when none is left. */
function removalPreview(stores: Stores, rule: MockRetailRule): RetailRulePreview {
  const last = rule.scope === 'global';
  return {
    following: rule.following,
    changes: last ? 0 : rule.following,
    raised: last ? 0 : rule.following,
    lowered: 0,
    atFloor: 0,
    noRule: last ? rule.following : 0,
    lines: last ? [] : stores.pricing.previewLines.slice(0, 2),
    truncated: false,
  };
}

/** Reads the `change` of a preview request and answers the preview, or the refusal the write would give. */
async function previewOf(stores: Stores, request: Request): Promise<Response> {
  const body = await bodyOf(request);
  const change = (body.change ?? {}) as Record<string, unknown>;
  const problems: FieldProblem[] = [];
  const rule = typeof change.id === 'number' ? stores.pricing.rules.find(change.id) : undefined;
  if (change.kind === 'create') {
    const rest = (change.rule ?? {}) as Record<string, unknown>;
    readTarget(rest, stores.pricing, problems, 'change.rule.');
    readFigures(rest, problems, 'change.rule.');
    if (!('percent' in rest)) problems.push({ field: 'change.rule.percent', message: 'Enter a margin.' });
    return problems.length > 0 ? invalid(problems) : HttpResponse.json(movingPreview(stores));
  }
  if (change.kind === 'update' || change.kind === 'delete') {
    if (!rule) return notFound('retail pricing rule', change.id);
    if (change.kind === 'delete') return HttpResponse.json(removalPreview(stores, rule));
    const rest = (change.rule ?? {}) as Record<string, unknown>;
    const figures = readFigures(rest, problems, 'change.rule.');
    if (problems.length > 0) return invalid(problems);
    // Turning a rule off takes it away; every other edit (and turning it on) moves prices to it.
    return HttpResponse.json(
      figures.isActive === false ? removalPreview(stores, rule) : movingPreview(stores),
    );
  }
  return invalid([{ field: 'change.kind', message: 'Choose create, update or delete.' }]);
}

const MONEY = /^-?\d+\.\d{4}$/;
const SEEN_MESSAGE = 'Send the price you saw for each price change, once.';

/** Reads `seen` of an apply: one `{ id, newPrice }` for every id, none twice, none beyond `ids`. `null` when it is not so. */
function readSeen(value: unknown, ids: number[]): Map<number, string | null> | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  const seen = new Map<number, string | null>();
  for (const entry of value as unknown[]) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return null;
    const { id, newPrice, ...rest } = entry as Record<string, unknown>;
    if (Object.keys(rest).length > 0 || !('newPrice' in entry)) return null;
    if (typeof id !== 'number' || !Number.isInteger(id) || seen.has(id)) return null;
    if (newPrice !== null && !(typeof newPrice === 'string' && MONEY.test(newPrice))) return null;
    seen.set(id, newPrice);
  }
  const wanted = new Set(ids);
  return seen.size === wanted.size && [...seen.keys()].every((id) => wanted.has(id)) ? seen : null;
}

/** The rule routes and the price change routes. Specific paths first: `/preview` and `/resolve` before `/:id`. */
export const retailPricingRoutes: HttpHandler[] = [
  http.post('*/admin/retail-price-rules/preview', ({ request }) =>
    signedIn(request, async () => previewOf(await storefrontStore(), request)),
  ),

  http.get('*/admin/retail-price-rules', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const order = { global: 0, type: 1, category: 2 };
      const rows = stores.pricing.rules
        .list()
        .sort((a, b) => order[a.scope] - order[b.scope] || a.id - b.id)
        .map((rule) => toRule(stores, rule));
      return listAnswer(rows, request, ['label', 'categoryName']);
    }),
  ),

  http.post('*/admin/retail-price-rules', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const problems: FieldProblem[] = [];
      const target = readTarget(body, stores.pricing, problems);
      const figures = readFigures(body, problems);
      if (!('percent' in body)) problems.push({ field: 'percent', message: 'Enter a margin.' });
      if (problems.length > 0 || !target) return invalid(problems);
      const created = stores.pricing.rules.insert({
        ...target,
        percent: figures.percent ?? '0.0000',
        fixed: figures.fixed ?? '0.0000',
        rounding: figures.rounding ?? 'cent',
        roundFrom: figures.roundFrom ?? '5.0000',
        autoFollowPercent: figures.autoFollowPercent ?? 25,
        isActive: figures.isActive ?? true,
        following: 0,
        updatedAt: new Date().toISOString(),
      });
      return HttpResponse.json(toRule(stores, created), { status: 201 });
    }),
  ),

  http.patch('*/admin/retail-price-rules/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const rule = stores.pricing.rules.find(String(params.id));
      if (!rule) return notFound('retail pricing rule', params.id);
      const body = await bodyOf(request);
      const problems: FieldProblem[] = [];
      const figures = readFigures(body, problems);
      for (const key of Object.keys(body).filter((name) => !RULE_KEYS.includes(name))) {
        problems.push({ field: key, message: 'This cannot be changed. Make a new rule instead.' });
      }
      if (Object.keys(body).length === 0)
        problems.push({ field: 'body', message: 'Send at least one field to change.' });
      if (problems.length > 0) return invalid(problems);
      const saved = stores.pricing.rules.patch(rule.id, { ...figures, updatedAt: new Date().toISOString() });
      return HttpResponse.json(toRule(stores, saved ?? rule));
    }),
  ),

  http.delete('*/admin/retail-price-rules/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      return stores.pricing.rules.remove(String(params.id))
        ? new HttpResponse(null, { status: 204 })
        : notFound('retail pricing rule', params.id);
    }),
  ),

  http.post('*/admin/retail-price-changes/resolve', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is number => Number.isInteger(id)) : [];
      if (ids.length === 0 || ids.length > 200 || ids.length !== (body.ids as unknown[]).length)
        return invalid([{ field: 'ids', message: 'Send one to 200 ids.' }]);
      if (body.action !== 'apply' && body.action !== 'keep')
        return invalid([{ field: 'action', message: 'Choose apply or keep.' }]);
      if (body.action === 'keep' && 'seen' in body)
        return invalid([{ field: 'seen', message: 'Keep takes no price list: send seen only with apply.' }]);
      const seen = body.action === 'apply' ? readSeen(body.seen, ids) : new Map<number, string | null>();
      if (!seen) return invalid([{ field: 'seen', message: SEEN_MESSAGE }]);
      const result = { applied: 0, kept: 0, skipped: [] as { id: number; reason: string }[] };
      for (const id of new Set(ids)) {
        const change = stores.pricing.changes.find(id);
        const skip = (reason: string) => result.skipped.push({ id, reason });
        if (!change || !change.waiting) {
          skip('not_waiting');
          continue;
        }
        const resolved = {
          waiting: false,
          resolvedAt: new Date().toISOString(),
          resolvedBy: SIGNED_IN_STAFF,
        };
        if (body.action === 'keep') {
          // Keeping the price makes it a typed one: the follow row goes.
          stores.pricing.changes.patch(id, { ...resolved, resolution: 'kept' });
          stores.pricing.sources.set(change.serviceId, { source: 'manual', ruleId: null });
          result.kept += 1;
          continue;
        }
        const rule = ruleFor(stores, change.serviceId);
        if (change.newPrice === null) skip('no_cost');
        else if (!rule) skip('no_rule');
        else if (change.movedTo || seen.get(id) !== change.newPrice) {
          // The figure on the screen is not the proposal's, or the cost moved since the list was read: write nothing, show the
          // figure of now and ask again.
          if (change.movedTo)
            stores.pricing.changes.patch(id, { newPrice: change.movedTo, movedTo: undefined });
          skip('changed');
        } else {
          stores.pricing.changes.patch(id, { ...resolved, resolution: 'applied' });
          stores.retail.set(change.serviceId, Number(change.newPrice));
          stores.pricing.sources.set(change.serviceId, { source: 'rule', ruleId: rule.id });
          result.applied += 1;
        }
      }
      return HttpResponse.json(result);
    }),
  ),

  http.get('*/admin/retail-price-changes', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      // `serviceId` is a filter of the route; the rows carry the service as an object, so it is applied here.
      const url = new URL(request.url);
      const serviceId = url.searchParams.get('serviceId');
      url.searchParams.delete('serviceId');
      const rows = stores.pricing.changes
        .list()
        .filter((change) => serviceId === null || String(change.serviceId) === serviceId)
        .map((change) => toChange(stores, change));
      return listAnswer(rows, new Request(url, request), ['service.name', 'service.code']);
    }),
  ),
];

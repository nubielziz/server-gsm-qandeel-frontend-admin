// Mock of the rows of a publish run (`/admin/publish-runs/:id/items*`): the list with its filters, the edit of one row of a draft and the bulk
// change. A run that is no longer a draft refuses an edit with a 409, and a price key from a role without storefront:update gets a 403 (plan
// 5.2). The mock keeps the figures as seeded and works out none (M92, `publishEdit.ts` has the rules).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { denied } from '@/features/notifications/mocks/access';
import { bodyOf, conflict, invalid, listAnswer, notFound, signedIn } from './http';
import { editItem } from './publishEdit';
import { storefrontStore } from './store';
import type { MockPublishRun, Stores } from './types';
import type { PublishItem } from '../types';

const SEARCH = ['title', 'slug', 'service.name', 'service.code'];

/** The run and, when the call needs a draft, the 409 for a run that is not one. */
async function draftOf(id: unknown): Promise<{ stores: Stores; m?: MockPublishRun; refusal?: Response }> {
  const stores = await storefrontStore();
  const m = stores.publish.runs.find(String(id));
  if (!m) return { stores, refusal: notFound('publish run', id) };
  if (m.run.status !== 'draft')
    return { stores, m, refusal: conflict('CONFLICT', 'Not a draft', 'This run is no longer a draft.') };
  return { stores, m };
}

/** The rows of a bulk request: the ids named, or every row that matches the filter. */
function selectedRows(m: MockPublishRun, select: Record<string, unknown>): PublishItem[] | null {
  if (Array.isArray(select.itemIds)) {
    const ids = new Set(select.itemIds.map(Number));
    return select.itemIds.length >= 1 && select.itemIds.length <= 500
      ? m.items.filter((item) => ids.has(item.id))
      : null;
  }
  const filter = select.filter as Record<string, unknown> | undefined;
  if (typeof filter !== 'object' || filter === null) return null;
  const q = typeof filter.q === 'string' ? filter.q.toLowerCase() : '';
  return m.items.filter(
    (item) =>
      (filter.state === undefined || item.state === filter.state) &&
      (filter.flag === undefined || item.flags.includes(filter.flag as never)) &&
      (filter.brandKind === undefined || item.detected.brandKind === filter.brandKind) &&
      (filter.included === undefined || item.included === filter.included) &&
      (q === '' ||
        `${item.title} ${item.slug} ${item.service.name} ${item.service.code}`.toLowerCase().includes(q)),
  );
}

/** The rows' routes. */
export const publishItemRoutes: HttpHandler[] = [
  http.get('*/admin/publish-runs/:id/items', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const m = stores.publish.runs.find(String(params.id));
      if (!m) return notFound('publish run', params.id);
      // These filters are not plain fields of the rows (`flag` is a list, `brandKind` is inside `detected`), so they are applied here.
      const url = new URL(request.url);
      const { flag, brandKind, afterId, result } = Object.fromEntries(
        ['flag', 'brandKind', 'afterId', 'result'].map((key) => [key, url.searchParams.get(key)]),
      );
      for (const key of ['flag', 'brandKind', 'afterId']) url.searchParams.delete(key);
      if (result === 'pending') url.searchParams.delete('result');
      const rows = m.items.filter(
        (item) =>
          (flag === null || item.flags.includes(flag as never)) &&
          (brandKind === null || item.detected.brandKind === brandKind) &&
          (afterId === null || item.id > Number(afterId)) &&
          (result !== 'pending' || item.result === null),
      );
      return listAnswer(rows, new Request(url, request), SEARCH);
    }),
  ),

  http.post('*/admin/publish-runs/:id/items/bulk', ({ request, params }) =>
    signedIn(request, async () => {
      const { m, refusal } = await draftOf(params.id);
      if (!m) return refusal as Response;
      if (refusal) return refusal;
      const body = await bodyOf(request);
      const set = (body.set ?? {}) as Record<string, unknown>;
      const rows = selectedRows(m, (body.select ?? {}) as Record<string, unknown>);
      if (rows === null) return invalid([{ field: 'select', message: 'Name one to 500 rows, or a filter.' }]);
      const facts = (['brand', 'carrier', 'country'] as const).filter((key) => typeof set[key] === 'string');
      if (facts.length === 0 && typeof set.included !== 'boolean')
        return invalid([{ field: 'set', message: 'Send at least one thing to set.' }]);
      const names = new Set(rows.map((item) => item.id));
      let [changed, refused] = [0, 0];
      m.items = m.items.map((item) => {
        if (!names.has(item.id)) return item;
        let next = item;
        if (typeof set.included === 'boolean') {
          if (set.included && item.state === 'blocked') refused += 1;
          else if (item.included !== set.included)
            [next, changed] = [{ ...next, included: set.included }, changed + 1];
        }
        if (facts.length > 0) {
          for (const key of facts) next = { ...next, [key]: String(set[key]).trim(), edited: true };
          changed += 1;
        }
        return next;
      });
      return HttpResponse.json({ changed, refused });
    }),
  ),

  http.patch('*/admin/publish-runs/:id/items/:itemId', ({ request, params }) =>
    signedIn(request, async () => {
      const body = await bodyOf(request);
      // A price key also needs storefront:update (the controller's second check, plan 5.2): the 403 comes before the state checks.
      if ('retailPrice' in body || 'pricing' in body) {
        const forbidden = await denied(request, 'storefront:update');
        if (forbidden) return forbidden;
      }
      const { stores, m, refusal } = await draftOf(params.id);
      if (!m) return refusal as Response;
      const item = m.items.find((row) => row.id === Number(params.itemId));
      if (!item) return notFound('publish row', params.itemId);
      if (refusal) return refusal;
      const taken = new Set([
        ...stores.listings.list().map((listing) => listing.slug),
        ...m.items.filter((row) => row.id !== item.id).map((row) => row.slug),
      ]);
      const seed = stores.publish.template.find((row) => row.serviceId === item.serviceId);
      const edited = editItem(item, body, { taken, seed });
      if (Array.isArray(edited)) return invalid(edited);
      m.items = m.items.map((row) => (row.id === item.id ? edited : row));
      return HttpResponse.json(edited);
    }),
  ),
];

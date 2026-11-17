// Mock of the Search tab's routes (`/admin/search/*`): synonyms, pinned results, hidden popular terms, the report, the preview and
// the index with its rebuild. The mock plays the server for the rules the backend plan states: terms are cleaned and distinct (2 to
// 20), a pin needs a listed listing for every service it names (422 on its row), a query and match pair has one rule
// (409 CONFLICT), a second rebuild is refused (409 JOB_ALREADY_RUNNING). Nothing here touches a real engine.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { problem, type ProblemError } from '@/mocks/problem';
import {
  REPORT_DAYS,
  type ReportDays,
  type SearchPin,
  type SearchPreview,
  type SearchSynonym,
} from '../types';
import { bodyOf, conflict, invalid, listAnswer, notFound, signedIn } from './http';
import { reportFor } from './searchReport';
import { storefrontStore } from './store';
import type { MockListing, MockPin, Stores } from './types';

/** How long a mock rebuild runs, in milliseconds. */
export const REBUILD_MS = 8_000;

const NO_CONTENT = () => new HttpResponse(null, { status: 204 });

/** The server's cleaning of a term: lower case, no `&`, brackets and bars as spaces, one space between words. */
function clean(value: unknown): string {
  return typeof value === 'string'
    ? value
        .toLowerCase()
        .replace(/&/g, '')
        .replace(/[()[\]{}<>|,;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

/** The listing that lets a service be pinned or hidden: a listed one. */
function pinnable(stores: Stores, serviceId: unknown): MockListing | undefined {
  return stores.listings.list().find((row) => row.serviceId === serviceId && row.isListed);
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// ---------- synonyms ----------

/** The rule a body describes, or the 422 messages. `base` carries the current values of a change. */
function readSynonym(
  body: Record<string, unknown>,
  base?: SearchSynonym,
): { value: Omit<SearchSynonym, 'id' | 'createdAt' | 'updatedAt'> } | { errors: ProblemError[] } {
  const errors: ProblemError[] = [];
  const kind = 'kind' in body ? body.kind : (base?.kind ?? 'multi');
  if (kind !== 'multi' && kind !== 'one_way') errors.push({ field: 'kind', message: 'Choose a kind.' });
  const terms = 'terms' in body ? asArray(body.terms).map(clean).filter(Boolean) : (base?.terms ?? []);
  if (terms.length < 2 || terms.length > 20) {
    errors.push({ field: 'terms', message: 'A rule needs 2 to 20 terms.' });
  } else if (new Set(terms).size !== terms.length) {
    errors.push({ field: 'terms', message: 'Terms must be different from each other.' });
  } else if (terms.some((term) => term.length > 60)) {
    errors.push({ field: 'terms', message: 'Each term has at most 60 characters.' });
  }
  const root = kind === 'one_way' ? ('root' in body ? clean(body.root) : (base?.root ?? '')) : '';
  if (kind === 'one_way' && !root) errors.push({ field: 'root', message: 'A one-way rule needs a root.' });
  if (errors.length > 0) return { errors };
  return {
    value: {
      kind: kind as SearchSynonym['kind'],
      root: kind === 'one_way' ? root : null,
      terms,
      isEnabled: 'isEnabled' in body ? body.isEnabled !== false : (base?.isEnabled ?? true),
      note: 'note' in body && typeof body.note === 'string' ? body.note.trim() : (base?.note ?? ''),
    },
  };
}

const synonymRoutes: HttpHandler[] = [
  http.get('*/admin/search/synonyms', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await storefrontStore()).search.synonyms.list(), request, ['terms', 'root', 'note']),
    ),
  ),
  http.post('*/admin/search/synonyms', ({ request }) =>
    signedIn(request, async () => {
      const { search } = await storefrontStore();
      const read = readSynonym(await bodyOf(request));
      if ('errors' in read) return invalid(read.errors);
      const now = new Date().toISOString();
      return HttpResponse.json(search.synonyms.insert({ ...read.value, createdAt: now, updatedAt: now }), {
        status: 201,
      });
    }),
  ),
  http.patch('*/admin/search/synonyms/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { search } = await storefrontStore();
      const rule = search.synonyms.find(String(params.id));
      if (!rule) return notFound('synonym', params.id);
      const read = readSynonym(await bodyOf(request), rule);
      if ('errors' in read) return invalid(read.errors);
      return HttpResponse.json(
        search.synonyms.patch(rule.id, { ...read.value, updatedAt: new Date().toISOString() }),
      );
    }),
  ),
  http.delete('*/admin/search/synonyms/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const removed = (await storefrontStore()).search.synonyms.remove(String(params.id));
      return removed ? NO_CONTENT() : notFound('synonym', params.id);
    }),
  ),
];

// ---------- pinned results ----------

/** A stored rule as the API sends it: with the titles of its services, read from the listings. */
function toPin(stores: Stores, row: MockPin): SearchPin {
  const titleOf = (serviceId: number) =>
    stores.listings.list().find((l) => l.serviceId === serviceId)?.publicTitle ?? `Service ${serviceId}`;
  return {
    ...row,
    pinned: row.pinned.map((item) => ({ ...item, title: titleOf(item.serviceId) })),
    hidden: row.hidden.map((serviceId) => ({ serviceId, title: titleOf(serviceId) })),
  };
}

/** The pin a body describes, or the 422 and 409 answers. `base` carries the current values of a change. */
function readPin(
  stores: Stores,
  body: Record<string, unknown>,
  base?: MockPin,
): { value: Omit<MockPin, 'id' | 'createdAt' | 'updatedAt'> } | { response: Response } {
  const errors: ProblemError[] = [];
  const query = 'query' in body ? clean(body.query) : (base?.query ?? '');
  if (!query || query.length > 100) errors.push({ field: 'query', message: 'Enter 1 to 100 characters.' });
  const match = 'match' in body ? body.match : (base?.match ?? 'contains');
  if (match !== 'exact' && match !== 'contains')
    errors.push({ field: 'match', message: 'Choose how it matches.' });

  const pinned =
    'pinned' in body
      ? asArray(body.pinned).map((item) => item as { serviceId?: unknown; position?: unknown })
      : (base?.pinned ?? []);
  const hidden = 'hidden' in body ? asArray(body.hidden) : (base?.hidden ?? []);
  if (pinned.length > 10) errors.push({ field: 'pinned', message: 'Pin at most 10 services.' });
  if (new Set(pinned.map((item) => item.position)).size !== pinned.length) {
    errors.push({ field: 'pinned', message: 'Each pinned service needs its own position.' });
  }
  if (hidden.length > 50) errors.push({ field: 'hidden', message: 'Hide at most 50 services.' });
  const unlisted = 'This service is not listed on the site.';
  pinned.forEach((item, i) => {
    if (!pinnable(stores, item.serviceId)) errors.push({ field: `pinned.${i}.serviceId`, message: unlisted });
  });
  hidden.forEach((serviceId, i) => {
    if (!pinnable(stores, serviceId)) errors.push({ field: `hidden.${i}`, message: unlisted });
  });

  const dateOf = (key: 'startsAt' | 'endsAt') =>
    key in body ? ((body[key] as string | null) ?? null) : (base?.[key] ?? null);
  const startsAt = dateOf('startsAt');
  const endsAt = dateOf('endsAt');
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    errors.push({ field: 'endsAt', message: 'The end must come after the start.' });
  }
  if (errors.length > 0) return { response: invalid(errors) };
  const twin = stores.search.pins
    .list()
    .find((row) => row.query === query && row.match === match && row.id !== base?.id);
  if (twin) {
    const message = `There is already a rule for "${query}" with this match.`;
    return { response: conflict('CONFLICT', 'Rule already exists', message, [{ field: 'query', message }]) };
  }
  return {
    value: {
      query,
      match: match as MockPin['match'],
      pinned: pinned.map((item) => ({ serviceId: Number(item.serviceId), position: Number(item.position) })),
      hidden: hidden.map(Number),
      startsAt,
      endsAt,
      isEnabled: 'isEnabled' in body ? body.isEnabled !== false : (base?.isEnabled ?? true),
      note: 'note' in body && typeof body.note === 'string' ? body.note.trim() : (base?.note ?? ''),
    },
  };
}

const pinRoutes: HttpHandler[] = [
  http.get('*/admin/search/pins', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      return listAnswer(
        stores.search.pins.list().map((row) => toPin(stores, row)),
        request,
        ['query', 'note'],
      );
    }),
  ),
  http.post('*/admin/search/pins', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const read = readPin(stores, await bodyOf(request));
      if ('response' in read) return read.response;
      const now = new Date().toISOString();
      const created = stores.search.pins.insert({ ...read.value, createdAt: now, updatedAt: now });
      return HttpResponse.json(toPin(stores, created), { status: 201 });
    }),
  ),
  http.patch('*/admin/search/pins/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const rule = stores.search.pins.find(String(params.id));
      if (!rule) return notFound('pinned results rule', params.id);
      const read = readPin(stores, await bodyOf(request), rule);
      if ('response' in read) return read.response;
      const changed = stores.search.pins.patch(rule.id, {
        ...read.value,
        updatedAt: new Date().toISOString(),
      });
      return HttpResponse.json(changed && toPin(stores, changed));
    }),
  ),
  http.delete('*/admin/search/pins/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const removed = (await storefrontStore()).search.pins.remove(String(params.id));
      return removed ? NO_CONTENT() : notFound('pinned results rule', params.id);
    }),
  ),
];

// ---------- hidden popular terms ----------

const hiddenRoutes: HttpHandler[] = [
  http.get('*/admin/search/hidden-terms', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await storefrontStore()).search.hidden.list(), request, ['term', 'note']),
    ),
  ),
  http.post('*/admin/search/hidden-terms', ({ request }) =>
    signedIn(request, async () => {
      const { search } = await storefrontStore();
      const body = await bodyOf(request);
      const term = clean(body.term);
      if (!term || term.length > 64)
        return invalid([{ field: 'term', message: 'Enter 1 to 64 characters.' }]);
      if (search.hidden.list().some((row) => row.term === term)) {
        return conflict(
          'CONFLICT',
          'Already hidden',
          `"${term}" is already hidden from the popular searches.`,
        );
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const created = search.hidden.insert({ term, note, createdAt: new Date().toISOString() });
      return HttpResponse.json(created, { status: 201 });
    }),
  ),
  http.delete('*/admin/search/hidden-terms/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const removed = (await storefrontStore()).search.hidden.remove(String(params.id));
      return removed ? NO_CONTENT() : notFound('hidden term', params.id);
    }),
  ),
];

// ---------- report, preview, index ----------

/** Whether a rule is in force right now: on, and inside its dates. */
function inForce(rule: MockPin, now: number): boolean {
  if (!rule.isEnabled) return false;
  if (rule.startsAt && Date.parse(rule.startsAt) > now) return false;
  return !(rule.endsAt && Date.parse(rule.endsAt) <= now);
}

/** The top 10 listed services for a query: title words match, pins first at their positions, hidden ones left out. */
function previewOf(stores: Stores, q: string): SearchPreview {
  const words = clean(q).split(' ');
  const rules = stores.search.pins
    .list()
    .filter((rule) => inForce(rule, Date.now()))
    .filter((rule) =>
      rule.match === 'exact' ? clean(q) === rule.query : ` ${clean(q)} `.includes(` ${rule.query} `),
    );
  const hidden = new Set(rules.flatMap((rule) => rule.hidden));
  const pins = new Map(rules.flatMap((rule) => rule.pinned.map((p) => [p.serviceId, p.position] as const)));
  const organic = stores.listings
    .list()
    .filter((row) => row.isListed)
    .filter((row) =>
      words.every(
        (word) => row.publicTitle.toLowerCase().includes(word) || row.brand.toLowerCase().includes(word),
      ),
    )
    .filter((row) => !hidden.has(row.serviceId) && !pins.has(row.serviceId))
    .sort((a, b) => a.sort - b.sort)
    .map((row) => ({ serviceId: row.serviceId, title: row.publicTitle }));
  const titleOf = (serviceId: number) =>
    stores.listings.list().find((r) => r.serviceId === serviceId)?.publicTitle ?? '';
  const slots: SearchPreview['hits'] = [...pins]
    .sort((a, b) => a[1] - b[1])
    .map(([serviceId, position]) => ({
      serviceId,
      title: titleOf(serviceId),
      position,
      pinned: true,
    }));
  // Organic hits fill the positions the pins leave free.
  const taken = new Set(slots.map((slot) => slot.position));
  let next = 1;
  for (const hit of organic) {
    while (taken.has(next)) next += 1;
    slots.push({ ...hit, position: next, pinned: false });
    taken.add(next);
  }
  return {
    engine: 'typesense',
    hits: slots.sort((a, b) => a.position - b.position).slice(0, 10),
    hiddenIds: [...hidden],
  };
}

const insightRoutes: HttpHandler[] = [
  http.get('*/admin/search/report', ({ request }) =>
    signedIn(request, () => {
      const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
      if (!REPORT_DAYS.includes(days as ReportDays)) {
        return invalid([{ field: 'days', message: 'Choose 7, 30 or 90 days.' }]);
      }
      return HttpResponse.json(reportFor(days as ReportDays));
    }),
  ),
  http.get('*/admin/search/preview', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
      if (!q || q.length > 100) return invalid([{ field: 'q', message: 'Enter 1 to 100 characters.' }]);
      if (stores.search.index.status.engine.status !== 'ok') {
        return problem(
          503,
          'UNAVAILABLE',
          'Search engine unavailable',
          'The search engine is not answering.',
        );
      }
      return HttpResponse.json(previewOf(stores, q));
    }),
  ),
  http.get('*/admin/search/index', ({ request }) =>
    signedIn(request, async () => {
      const { index } = (await storefrontStore()).search;
      // A rebuild ends by itself after `REBUILD_MS`: the documents count stays, the last rebuild moves to now.
      if (index.rebuildStartedAt !== null && Date.now() - index.rebuildStartedAt >= REBUILD_MS) {
        index.status.lastRebuildAt = new Date().toISOString();
        index.status.lastTermsBuildAt = index.status.lastRebuildAt;
        index.status.rebuild = { running: false, startedAt: null };
        index.rebuildStartedAt = null;
      }
      return HttpResponse.json(index.status);
    }),
  ),
  http.post('*/admin/search/index/rebuild', ({ request }) =>
    signedIn(request, async () => {
      const { index } = (await storefrontStore()).search;
      if (index.status.rebuild.running) {
        return conflict(
          'JOB_ALREADY_RUNNING',
          'Rebuild already running',
          'A rebuild of the search index is already running.',
        );
      }
      if (index.status.engine.status !== 'ok') {
        return problem(
          503,
          'UNAVAILABLE',
          'Search engine unavailable',
          'The search engine is not answering.',
        );
      }
      index.rebuildStartedAt = Date.now();
      index.status.rebuild = { running: true, startedAt: new Date(index.rebuildStartedAt).toISOString() };
      return new HttpResponse(null, { status: 202 });
    }),
  ),
];

/** The Search tab's routes. */
export const searchRoutes: HttpHandler[] = [
  ...synonymRoutes,
  ...pinRoutes,
  ...hiddenRoutes,
  ...insightRoutes,
];

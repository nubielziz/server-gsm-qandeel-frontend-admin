// Tests for the search tools' API functions, run against the dev mock API: each route's verb, address and body, the answers the
// backend plan states, and the refusals (422 on a field, 409 for a twin or a running rebuild, 503 while the engine is down).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { http } from 'msw';
import { problem } from '@/mocks/problem';
import { recordRequests } from '../test/requests';
import {
  createHiddenTerm,
  createSearchPin,
  createSearchSynonym,
  deleteHiddenTerm,
  deleteSearchPin,
  deleteSearchSynonym,
  getSearchIndex,
  getSearchPreview,
  getSearchReport,
  listHiddenTerms,
  listListings,
  listSearchPins,
  listSearchSynonyms,
  rebuildSearchIndex,
  updateSearchPin,
  updateSearchSynonym,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const failure = (promise: Promise<unknown>) => promise.catch((error: unknown) => error as ApiError);

describe('synonyms', () => {
  it('lists the five starting rules, filtered by on or off and searched by a term', async () => {
    const requests = recordRequests();
    const all = await listSearchSynonyms({ sort: ['updatedAt'], order: ['desc'] });
    expect(all.total).toBe(5);
    expect(all.data[0]).toMatchObject({ kind: 'multi', root: null, isEnabled: true });
    const found = await listSearchSynonyms({ q: 'knox' });
    expect(requests.last().url.searchParams.get('q')).toBe('knox');
    expect(found.data.map((rule) => rule.terms[0])).toEqual(['kg lock']);
    const off = await listSearchSynonyms({ filters: { isEnabled: false } });
    expect(requests.last().url.searchParams.get('isEnabled')).toBe('false');
    expect(off.total).toBe(0);
  });

  it('adds a rule, cleaning the terms, and refuses a repeat, a short list and a one-way rule without a root', async () => {
    const requests = recordRequests();
    const created = await createSearchSynonym({
      kind: 'multi',
      terms: ['Bypass FRP', 'frp bypass'],
      note: ' fast ',
    });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { kind: 'multi', terms: ['Bypass FRP', 'frp bypass'] },
    });
    expect(created).toMatchObject({ terms: ['bypass frp', 'frp bypass'], note: 'fast', isEnabled: true });
    expect(
      ((await failure(createSearchSynonym({ kind: 'multi', terms: ['a', 'A'] }))) as ApiError).fieldErrors
        .terms,
    ).toBeTruthy();
    expect(((await failure(createSearchSynonym({ kind: 'multi', terms: ['one'] }))) as ApiError).status).toBe(
      422,
    );
    expect(
      ((await failure(createSearchSynonym({ kind: 'one_way', terms: ['a', 'b'] }))) as ApiError).fieldErrors
        .root,
    ).toBeTruthy();
  });

  it('changes only what it is given, switches a rule off, and deletes it', async () => {
    const requests = recordRequests();
    const off = await updateSearchSynonym(1, { isEnabled: false });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { isEnabled: false } });
    expect(off).toMatchObject({ isEnabled: false, terms: ['frp', 'google account lock', 'frp lock'] });
    await deleteSearchSynonym(1);
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect(requests.last().url.pathname).toBe('/admin/search/synonyms/1');
    expect((await listSearchSynonyms()).total).toBe(4);
    expect(((await failure(deleteSearchSynonym(99))) as ApiError).status).toBe(404);
  });
});

describe('pinned results', () => {
  it('lists the starting rule with the titles of its services', async () => {
    const pins = await listSearchPins();
    expect(pins.total).toBe(1);
    expect(pins.data[0]).toMatchObject({ query: 'unlock', match: 'contains', isEnabled: true, hidden: [] });
    expect(pins.data[0].pinned).toHaveLength(1);
    expect(pins.data[0].pinned[0].title).toBeTruthy();
  });

  it('adds a rule for a listed English service and sends the ids', async () => {
    const english = (await listListings({ filters: { locale: 'en', isListed: true }, start: 0, end: 3 }))
      .data;
    const requests = recordRequests();
    const created = await createSearchPin({
      query: 'Icloud',
      match: 'exact',
      pinned: [{ serviceId: english[0].serviceId, position: 2 }],
      hidden: [english[1].serviceId],
    });
    expect(requests.last().body).toMatchObject({
      query: 'Icloud',
      match: 'exact',
      hidden: [english[1].serviceId],
    });
    expect(created).toMatchObject({ query: 'icloud', match: 'exact' });
    expect(created.pinned[0]).toMatchObject({
      serviceId: english[0].serviceId,
      position: 2,
      title: english[0].publicTitle,
    });
    expect(created.hidden[0].title).toBe(english[1].publicTitle);
  });

  it('refuses a query and match that already have a rule with 409, and an unlisted service on its row with 422', async () => {
    const twin = (await failure(
      createSearchPin({ query: 'unlock', match: 'contains', pinned: [], hidden: [] }),
    )) as ApiError;
    expect(twin.status).toBe(409);
    expect(twin.code).toBe('CONFLICT');
    const english = (await listListings({ filters: { locale: 'en', isListed: true }, start: 0, end: 1 }))
      .data;
    const unlisted = (await failure(
      createSearchPin({
        query: 'frp',
        match: 'exact',
        pinned: [
          { serviceId: english[0].serviceId, position: 1 },
          { serviceId: 987654, position: 2 },
        ],
        hidden: [],
      }),
    )) as ApiError;
    expect(unlisted.status).toBe(422);
    expect(unlisted.fieldErrors['pinned.1.serviceId']?.[0]).toContain('no listed English listing');
    expect(unlisted.fieldErrors['pinned.0.serviceId']).toBeUndefined();
  });

  it('switches a rule off and deletes it', async () => {
    expect(await updateSearchPin(1, { isEnabled: false })).toMatchObject({
      isEnabled: false,
      query: 'unlock',
    });
    await deleteSearchPin(1);
    expect((await listSearchPins()).total).toBe(0);
  });
});

describe('hidden terms', () => {
  it('lists, hides a term once, and shows it again', async () => {
    expect((await listHiddenTerms()).data.map((row) => row.term)).toEqual(['free']);
    const requests = recordRequests();
    const created = await createHiddenTerm({ term: ' Mi Account ', note: 'old brand' });
    expect(requests.last().body).toEqual({ term: ' Mi Account ', note: 'old brand' });
    expect(created).toMatchObject({ term: 'mi account', note: 'old brand' });
    expect(((await failure(createHiddenTerm({ term: 'mi account' }))) as ApiError).code).toBe('CONFLICT');
    expect(((await failure(createHiddenTerm({ term: ' ' }))) as ApiError).status).toBe(422);
    await deleteHiddenTerm(created.id);
    expect((await listHiddenTerms()).total).toBe(1);
  });
});

describe('report, preview and index', () => {
  it('reads the report of 7, 30 and 90 days with terms and counts only', async () => {
    const requests = recordRequests();
    const month = await getSearchReport(30);
    expect(requests.last().url.searchParams.get('days')).toBe('30');
    expect(month.topTerms).toHaveLength(12);
    expect(month.zeroResultTerms).toHaveLength(4);
    expect(Object.keys(month.topTerms[0]).sort()).toEqual(['searches', 'term', 'visitors', 'zeroResults']);
    expect(Object.keys(month.zeroResultTerms[0]).sort()).toEqual(['lastSeen', 'searches', 'term']);
    expect((await getSearchReport(7)).totals.searches).toBeLessThan(month.totals.searches);
    expect((await getSearchReport(90)).totals.searches).toBeGreaterThan(month.totals.searches);
  });

  it('previews a query: pinned services first, with the pinned mark', async () => {
    const preview = await getSearchPreview({ q: 'unlock' });
    expect(preview.engine).toBe('typesense');
    expect(preview.hits[0]).toMatchObject({ position: 1, pinned: true });
    expect(preview.hits.length).toBeLessThanOrEqual(10);
    const plain = await getSearchPreview({ q: 'zzz nothing like this' });
    expect(plain.hits).toEqual([]);
  });

  it('answers UNAVAILABLE for the preview while the engine is down', async () => {
    mockServer.use(
      http.get('*/admin/search/preview', () =>
        problem(503, 'UNAVAILABLE', 'Unavailable', 'The search engine is not answering.'),
      ),
    );
    const error = (await failure(getSearchPreview({ q: 'unlock' }))) as ApiError;
    expect([error.status, error.code]).toEqual([503, 'UNAVAILABLE']);
  });

  it('reads the index, starts one rebuild and refuses a second', async () => {
    const before = await getSearchIndex();
    expect(before).toMatchObject({
      engine: { status: 'ok', version: '30.2' },
      documents: 14,
      expectedDocuments: 14,
      rebuild: { running: false },
      lastError: null,
    });
    const requests = recordRequests();
    await rebuildSearchIndex();
    expect(requests.last()).toMatchObject({ method: 'POST' });
    expect(requests.last().url.pathname).toBe('/admin/search/index/rebuild');
    expect((await getSearchIndex()).rebuild.running).toBe(true);
    const again = (await failure(rebuildSearchIndex())) as ApiError;
    expect([again.status, again.code]).toEqual([409, 'JOB_ALREADY_RUNNING']);
  });
});

describe('the listings filter the pin picker uses', () => {
  it('asks for English listings only and the mock honours it', async () => {
    const requests = recordRequests();
    const english = await listListings({ filters: { locale: 'en', isListed: true } });
    expect(requests.last().url.searchParams.get('locale')).toBe('en');
    expect(english.data.every((row) => row.locale === 'en' && row.isListed)).toBe(true);
    expect((await listListings({ filters: { locale: 'ar' } })).total).toBe(0);
  });
});

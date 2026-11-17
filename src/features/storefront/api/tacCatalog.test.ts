// Tests for the TAC catalogue API functions, run against the dev mock API: search, read, add and correct an entry.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createTacEntry, getTacEntry, listTacEntries, storefrontResources, updateTacEntry } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

describe('listTacEntries', () => {
  it('searches the prefix, brand and model and sorts', async () => {
    const requests = recordRequests();
    const byPrefix = await listTacEntries({ q: '3538', sort: ['tac'], order: ['asc'] });
    expect(requests.last().url.searchParams.get('q')).toBe('3538');
    expect(byPrefix.data.map((e) => e.tac)).toEqual(['35389011']);
    const samsung = await listTacEntries({ q: 'Galaxy', start: 0, end: 10 });
    expect(samsung.data.map((e) => e.brand)).toEqual(['Samsung', 'Samsung']);
    expect(samsung.total).toBe(2);
  });

  it('gives the brand, the model code and the name customers know', async () => {
    expect(await getTacEntry(1)).toMatchObject({
      tac: '35389011',
      brand: 'Apple',
      model: 'A2633',
      marketingName: 'iPhone 13',
      releaseYear: 2021,
    });
  });
});

describe('createTacEntry and updateTacEntry', () => {
  it('adds a TAC and sends no empty optional field', async () => {
    const requests = recordRequests();
    const created = await createTacEntry({ tac: '35000001', brand: 'Nokia', model: 'TA-1400' });
    expect(requests.last().body).toEqual({ tac: '35000001', brand: 'Nokia', model: 'TA-1400' });
    expect(created).toMatchObject({ tac: '35000001', source: 'manual' });
  });

  it('refuses a prefix that is already there, under the TAC field', async () => {
    const error = await createTacEntry({ tac: '35389011', brand: 'Apple', model: 'X' }).catch(
      (e: unknown) => e,
    );
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).fieldErrors.tac?.[0]).toContain('already in the catalogue');
  });

  it('refuses a prefix that is not 8 digits', async () => {
    const error = await createTacEntry({ tac: '3538', brand: 'Apple', model: 'X' }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(422);
  });

  it('corrects only the fields it is given', async () => {
    const requests = recordRequests();
    const updated = await updateTacEntry(1, { marketingName: 'iPhone 13 (A2633)' });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { marketingName: 'iPhone 13 (A2633)' } });
    expect(updated).toMatchObject({ brand: 'Apple', marketingName: 'iPhone 13 (A2633)' });
  });
});

describe('storefrontResources', () => {
  it('registers the ten resources with the operations their endpoints offer', () => {
    expect(Object.keys(storefrontResources).sort()).toEqual([
      'content-pages',
      'help-articles',
      'legal-documents',
      'retail-price-changes',
      'retail-price-rules',
      'search-hidden-terms',
      'search-pins',
      'search-synonyms',
      'service-listings',
      'tac-catalog',
    ]);
    // Legal documents are written and published, never changed.
    expect(storefrontResources['legal-documents'].update).toBeUndefined();
    expect(storefrontResources['tac-catalog'].update).toBe(updateTacEntry);
    // The search rules are listed through Refine; their writes use the typed functions.
    expect(storefrontResources['search-pins'].create).toBeUndefined();
    // The retail pricing lists are read through Refine; the rules are written through the typed functions.
    expect(storefrontResources['retail-price-rules'].list).toBeDefined();
    expect(storefrontResources['retail-price-rules'].create).toBeUndefined();
    expect(storefrontResources['retail-price-changes'].update).toBeUndefined();
  });
});

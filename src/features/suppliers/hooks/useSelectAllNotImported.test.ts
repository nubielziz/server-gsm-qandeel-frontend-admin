// Tests for the id read behind "Select all not imported": the query it sends, the pages it goes through, a server that sends
// fewer rows than asked for, and a cancelled read. The list route is answered here, so no session is needed.
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { ID_PAGE_SIZE, readNotImportedIds } from './useSelectAllNotImported';

setupMockApi();

/** A service list of `total` rows (ids 1…total) that sends at most `most` rows per call, and writes down each query. */
function listOf(total: number, most = 1_000) {
  const asked: URLSearchParams[] = [];
  mockServer.use(
    http.get('*/admin/suppliers/:id/services', ({ request }) => {
      const params = new URL(request.url).searchParams;
      asked.push(params);
      const start = Number(params.get('_start'));
      const end = Math.min(Number(params.get('_end')), total, start + most);
      const rows = Array.from({ length: Math.max(0, end - start) }, (_, index) => ({
        id: start + index + 1,
      }));
      return HttpResponse.json(rows, { headers: { 'x-total-count': String(total) } });
    }),
  );
  return asked;
}

describe('readNotImportedIds', () => {
  it('reads pages of 500 until the total is reached, for the services not imported yet in the picker’s order', async () => {
    const asked = listOf(1_203);
    const ids = await readNotImportedIds(1, { q: 'unlock' });
    expect(ID_PAGE_SIZE).toBe(500);
    expect(ids).toHaveLength(1_203);
    expect(ids[0]).toBe(1);
    expect(ids.at(-1)).toBe(1_203);
    expect(asked.map((params) => [params.get('_start'), params.get('_end')])).toEqual([
      ['0', '500'],
      ['500', '1000'],
      ['1000', '1500'],
    ]);
    for (const params of asked) {
      expect(params.get('imported')).toBe('false');
      expect(params.get('q')).toBe('unlock');
      expect(params.get('_sort')).toBe('name');
      expect(params.get('_order')).toBe('asc');
      expect(params.has('remoteGroup')).toBe(false);
    }
  });

  it('sends the type and the name of the group when one is chosen', async () => {
    const asked = listOf(3);
    await readNotImportedIds(1, { q: '', group: { type: 'imei', remoteGroup: 'Apple' } });
    expect(asked).toHaveLength(1);
    expect(asked[0].get('remoteGroup')).toBe('Apple');
    expect(asked[0].get('type')).toBe('imei');
    expect(asked[0].has('q')).toBe(false);
  });

  it('is done after one call when everything fits, and after none beyond an empty list', async () => {
    const asked = listOf(500);
    expect(await readNotImportedIds(1, { q: '' })).toHaveLength(500);
    expect(asked).toHaveLength(1);
    const none = listOf(0);
    expect(await readNotImportedIds(1, { q: '' })).toEqual([]);
    expect(none).toHaveLength(1);
  });

  it('loses no row when the server sends fewer rows per call than it was asked for', async () => {
    const asked = listOf(250, 100);
    const ids = await readNotImportedIds(1, { q: '' });
    expect(ids).toHaveLength(250);
    expect(new Set(ids).size).toBe(250);
    expect(asked.map((params) => params.get('_start'))).toEqual(['0', '100', '200']);
  });

  it('stops with an error when the read is cancelled', async () => {
    listOf(1_203);
    const controller = new AbortController();
    controller.abort();
    await expect(readNotImportedIds(1, { q: '' }, controller.signal)).rejects.toBeDefined();
  });
});

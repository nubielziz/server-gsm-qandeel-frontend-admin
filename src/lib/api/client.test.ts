// Tests for the fetch client: credentials, CSRF, query strings, totals, downloads and error mapping.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiDownload, apiGet, apiList, apiPatch, apiPost, apiPut, apiUrl, pathOf } from './client';
import { forgetCsrfToken } from './csrf';
import { ApiError, ERROR_CODES } from './errors';

const API = 'http://api.test';
const server = setupServer();

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', `${API}/`));
afterEach(() => {
  server.resetHandlers();
  forgetCsrfToken();
  clearCookie('csrf_token');
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('requests', () => {
  it('sends cookies, asks for JSON and prefixes the base URL (trailing slash ignored)', async () => {
    let seen: Request | undefined;
    server.use(
      http.get(`${API}/admin/things`, ({ request }) => {
        seen = request;
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(apiGet('/admin/things')).resolves.toEqual({ ok: true });
    expect(seen?.credentials).toBe('include');
    expect(seen?.headers.get('accept')).toBe('application/json');
    expect(seen?.headers.has('content-type')).toBe(false);
  });

  it('sends the CSRF header from the cookie on every method except GET', async () => {
    document.cookie = 'csrf_token=cookie-token; path=/';
    const seen: Record<string, string | null> = {};
    server.use(
      http.all(`${API}/admin/things`, ({ request }) => {
        seen[request.method] = request.headers.get('x-csrf-token');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await apiGet('/admin/things');
    await apiPost('/admin/things', { a: 1 });
    await apiPut('/admin/things', { a: 1 });
    await apiPatch('/admin/things', { a: 1 });
    await apiDelete('/admin/things');
    expect(seen).toEqual({
      GET: null,
      POST: 'cookie-token',
      PUT: 'cookie-token',
      PATCH: 'cookie-token',
      DELETE: 'cookie-token',
    });
  });

  it('falls back to the X-CSRF-Token response header when there is no readable cookie', async () => {
    let sent: string | null = null;
    server.use(
      http.get(`${API}/admin/auth/me`, () =>
        HttpResponse.json({}, { headers: { 'X-CSRF-Token': 'header-token' } }),
      ),
      http.post(`${API}/admin/things`, ({ request }) => {
        sent = request.headers.get('x-csrf-token');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await apiGet('/admin/auth/me');
    await apiPost('/admin/things');
    expect(sent).toBe('header-token');
  });

  it('sends a JSON body with its content type only when there is a body', async () => {
    const seen: { type: string | null; text: string }[] = [];
    server.use(
      http.post(`${API}/admin/things`, async ({ request }) => {
        seen.push({ type: request.headers.get('content-type'), text: await request.text() });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await apiPost('/admin/things', { name: 'A', n: 2 });
    await apiPost('/admin/things');
    expect(seen[0]).toEqual({ type: 'application/json', text: '{"name":"A","n":2}' });
    expect(seen[1]).toEqual({ type: null, text: '' });
  });

  it('sends FormData untouched, so the browser can set the multipart boundary', async () => {
    let type: string | null = null;
    server.use(
      http.post(`${API}/admin/upload`, ({ request }) => {
        type = request.headers.get('content-type');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.txt');
    await apiPost('/admin/upload', form);
    expect(type).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('lets a call add headers', async () => {
    let key: string | null = null;
    server.use(
      http.post(`${API}/admin/things`, ({ request }) => {
        key = request.headers.get('idempotency-key');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await apiPost('/admin/things', {}, { headers: { 'Idempotency-Key': 'k-1' } });
    expect(key).toBe('k-1');
  });

  it('serialises the query: arrays repeat the key, empty values are skipped, booleans are words', async () => {
    let url = '';
    server.use(
      http.get(`${API}/admin/things`, ({ request }) => {
        url = request.url;
        return HttpResponse.json([]);
      }),
    );
    await apiGet('/admin/things', {
      ids: [1, 2],
      skip: undefined,
      none: null,
      blank: '',
      on: true,
      off: false,
      q: 'a b',
    });
    expect(new URL(url).search).toBe('?ids=1&ids=2&on=true&off=false&q=a+b');
  });

  it('returns undefined for 204 and for an empty 200', async () => {
    server.use(
      http.delete(`${API}/admin/things/1`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/admin/empty`, () => new HttpResponse('', { status: 200 })),
    );
    await expect(apiDelete('/admin/things/1')).resolves.toBeUndefined();
    await expect(apiGet('/admin/empty')).resolves.toBeUndefined();
  });

  it('reports a success body that is not JSON as an ApiError', async () => {
    server.use(http.get(`${API}/admin/odd`, () => new HttpResponse('not json', { status: 200 })));
    await expect(apiGet('/admin/odd')).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 });
  });
});

describe('apiList', () => {
  it('reads rows from the body and the total from x-total-count', async () => {
    let search = '';
    server.use(
      http.get(`${API}/admin/things`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([{ id: 1 }, { id: 2 }], { headers: { 'x-total-count': '57' } });
      }),
    );
    const result = await apiList<{ id: number }>(
      '/admin/things',
      { start: 0, end: 2, sort: ['id'], order: ['desc'], q: 'x', filters: { status: ['a', 'b'] } },
      { kind: 'k' },
    );
    expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }], total: 57 });
    expect(new URLSearchParams(search).get('_start')).toBe('0');
    expect(new URLSearchParams(search).get('_sort')).toBe('id');
    expect(new URLSearchParams(search).get('_order')).toBe('desc');
    expect(new URLSearchParams(search).getAll('status')).toEqual(['a', 'b']);
    expect(new URLSearchParams(search).get('kind')).toBe('k');
  });

  it('uses the number of rows when the header is missing or not a number', async () => {
    server.use(
      http.get(`${API}/admin/a`, () => HttpResponse.json([1, 2, 3])),
      http.get(`${API}/admin/b`, () => HttpResponse.json([1, 2], { headers: { 'x-total-count': 'many' } })),
    );
    await expect(apiList('/admin/a')).resolves.toEqual({ data: [1, 2, 3], total: 3 });
    await expect(apiList('/admin/b')).resolves.toEqual({ data: [1, 2], total: 2 });
  });
});

describe('failures', () => {
  it('turns a problem+json answer into an ApiError', async () => {
    server.use(
      http.post(`${API}/admin/staff`, () =>
        HttpResponse.json(
          {
            title: 'Check the form',
            status: 422,
            code: 'VALIDATION_FAILED',
            detail: 'Some fields are invalid.',
            errors: [{ pointer: '/email', message: 'Already taken.' }],
          },
          { status: 422, headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': 'req-7' } },
        ),
      ),
    );
    const error = await apiPost('/admin/staff', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: ERROR_CODES.VALIDATION_FAILED,
      requestId: 'req-7',
      fieldErrors: { email: ['Already taken.'] },
    });
  });

  it('reports rate limiting with the wait time', async () => {
    server.use(
      http.get(`${API}/admin/things`, () =>
        HttpResponse.json(
          { code: 'RATE_LIMITED', title: 'Slow down' },
          { status: 429, headers: { 'Retry-After': '12' } },
        ),
      ),
    );
    await expect(apiGet('/admin/things')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfter: 12,
    });
  });

  it('turns a failed fetch into a NETWORK_ERROR with status 0', async () => {
    server.use(http.get(`${API}/admin/things`, () => HttpResponse.error()));
    await expect(apiGet('/admin/things')).rejects.toMatchObject({
      status: 0,
      code: ERROR_CODES.NETWORK_ERROR,
    });
  });

  it('rethrows an abort untouched', async () => {
    server.use(http.get(`${API}/admin/things`, () => HttpResponse.json([])));
    const controller = new AbortController();
    controller.abort();
    const error = await apiGet('/admin/things', undefined, { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

describe('apiDownload', () => {
  function stubBrowserDownload() {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });
    return { created, clicks };
  }

  it('saves the file under the name from Content-Disposition', async () => {
    const { created, clicks } = stubBrowserDownload();
    server.use(
      http.get(
        `${API}/admin/orders/export`,
        () =>
          new HttpResponse('id,status\n1,done\n', {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="orders-2026-03.csv"',
            },
          }),
      ),
    );
    const name = await apiDownload('/admin/orders/export', { status: 'done' }, 'fallback.csv');
    expect(name).toBe('orders-2026-03.csv');
    expect(clicks).toEqual(['orders-2026-03.csv']);
    expect(created).toHaveLength(1);
    expect(created[0].size).toBe('id,status\n1,done\n'.length);
    expect(created[0].type).toBe('text/csv');
  });

  it('prefers the UTF-8 filename and uses the fallback when there is no header', async () => {
    const { clicks } = stubBrowserDownload();
    server.use(
      http.get(
        `${API}/admin/a`,
        () =>
          new HttpResponse('x', {
            headers: {
              'Content-Disposition': 'attachment; filename="a.csv"; filename*=UTF-8\'\'r%C3%A9sum%C3%A9.csv',
            },
          }),
      ),
      http.get(`${API}/admin/b`, () => new HttpResponse('x')),
    );
    await expect(apiDownload('/admin/a', undefined, 'fallback.csv')).resolves.toBe('résumé.csv');
    await expect(apiDownload('/admin/b', undefined, 'fallback.csv')).resolves.toBe('fallback.csv');
    expect(clicks).toEqual(['résumé.csv', 'fallback.csv']);
  });

  it('throws the ApiError instead of saving when the server refuses', async () => {
    const { clicks } = stubBrowserDownload();
    server.use(http.get(`${API}/admin/a`, () => HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 })));
    await expect(apiDownload('/admin/a', undefined, 'x.csv')).rejects.toMatchObject({ status: 403 });
    expect(clicks).toEqual([]);
  });
});

describe('apiUrl and pathOf', () => {
  it('builds an absolute URL from the base and the query', () => {
    expect(apiUrl('/admin/files/7')).toBe(`${API}/admin/files/7`);
    expect(apiUrl('admin/queues', { a: 1, b: [2, 3], c: undefined })).toBe(`${API}/admin/queues?a=1&b=2&b=3`);
  });

  it('uses the current origin when no base URL is set', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(apiUrl('/admin/x')).toBe(`${window.location.origin}/admin/x`);
  });

  it('fills :params with encoded values and throws on a missing one', () => {
    expect(pathOf('/admin/staff/:id/suspend', { id: 12 })).toBe('/admin/staff/12/suspend');
    expect(pathOf('/admin/reports/client-statement/:clientId', { clientId: 'a/b c' })).toBe(
      '/admin/reports/client-statement/a%2Fb%20c',
    );
    expect(pathOf('/admin/orders/:id/notes', { id: 1, extra: 2 })).toBe('/admin/orders/1/notes');
    expect(() => pathOf('/admin/staff/:id', {} as Record<string, string>)).toThrow(/missing "id"/);
  });
});

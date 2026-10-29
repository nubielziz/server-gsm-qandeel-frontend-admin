// Tests for getHealth (GET /health).
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHealth } from '.';

const API = 'http://api.test';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', API));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe('getHealth', () => {
  it('reads the health body from GET /health', async () => {
    server.use(
      http.get(`${API}/health`, () =>
        HttpResponse.json({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } }),
      ),
    );
    await expect(getHealth()).resolves.toEqual({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } });
  });

  it('throws an ApiError when the API answers with a failure', async () => {
    server.use(http.get(`${API}/health`, () => HttpResponse.json({ status: 'down' }, { status: 503 })));
    await expect(getHealth()).rejects.toMatchObject({ status: 503 });
  });
});

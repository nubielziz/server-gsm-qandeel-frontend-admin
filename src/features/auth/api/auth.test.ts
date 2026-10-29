// Each function must hit exactly the route in its @route tag, with the body the assumed contract describes.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetCsrfToken } from '@/lib/api';
import { getMe, login, logout, setPassword, setupTwoFactor, verifyTwoFactor } from '.';

const API = 'http://api.test';
const seen: { method: string; path: string; body: unknown }[] = [];
const server = setupServer(
  http.all(`${API}/admin/auth/*`, async ({ request }) => {
    const text = await request.text();
    seen.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: text ? JSON.parse(text) : undefined,
    });
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', API));
afterEach(() => {
  seen.length = 0;
  forgetCsrfToken();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe('auth API functions', () => {
  it('login posts the credentials', async () => {
    await login({ email: 'a@b.test', password: 'secret' });
    expect(seen).toEqual([
      { method: 'POST', path: '/admin/auth/login', body: { email: 'a@b.test', password: 'secret' } },
    ]);
  });

  it('verifyTwoFactor posts the code', async () => {
    await verifyTwoFactor({ code: '123456' });
    expect(seen).toEqual([{ method: 'POST', path: '/admin/auth/2fa', body: { code: '123456' } }]);
  });

  it('setupTwoFactor posts without a body and returns the setup data', async () => {
    server.use(
      http.post(`${API}/admin/auth/2fa/setup`, () =>
        HttpResponse.json({ secret: 'ABC', otpauthUrl: 'otpauth://totp/x?secret=ABC' }),
      ),
    );
    await expect(setupTwoFactor()).resolves.toEqual({
      secret: 'ABC',
      otpauthUrl: 'otpauth://totp/x?secret=ABC',
    });
  });

  it('logout posts without a body', async () => {
    await logout();
    expect(seen).toEqual([{ method: 'POST', path: '/admin/auth/logout', body: undefined }]);
  });

  it('getMe gets the current staff member', async () => {
    server.use(http.get(`${API}/admin/auth/me`, () => HttpResponse.json({ id: 1, email: 'a@b.test' })));
    await expect(getMe()).resolves.toMatchObject({ id: 1 });
  });

  it('setPassword posts the token and the new password', async () => {
    await setPassword({ token: 't-1', password: 'a-long-password' });
    await setPassword({ password: 'another-long-one' });
    expect(seen[0]).toEqual({
      method: 'POST',
      path: '/admin/auth/password/set',
      body: { token: 't-1', password: 'a-long-password' },
    });
    expect(seen[1].body).toEqual({ password: 'another-long-one' });
  });
});

// Tests for the auth provider: both sign-in steps, the session check, sign-out reasons and logout.
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ERROR_CODES, forgetCsrfToken } from '@/lib/api';
import { DEMO_CODE, DEMO_INVITE_TOKEN, DEMO_PASSWORD } from '@/mocks/session';
import { resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';
import { AUTH_PATHS, getMe, type Me } from '@/features/auth';
import { createAuthProvider } from './authProvider';
import { createMeCache } from './meCache';

const API = 'http://api.test';
const OWNER = 'rami@gsm-supply.example';

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', API));
afterEach(() => {
  mockServer.resetHandlers();
  resetMockState();
  forgetCsrfToken();
  vi.unstubAllEnvs();
});
afterAll(() => mockServer.close());

function setup() {
  const cache = createMeCache(() => getMe());
  return { cache, provider: createAuthProvider(cache) };
}

async function signIn(provider: ReturnType<typeof createAuthProvider>, email = OWNER) {
  await provider.login({ email, password: DEMO_PASSWORD });
  return provider.login({ code: DEMO_CODE });
}

describe('login', () => {
  it('step 1 sends a seeded admin to the code screen', async () => {
    const { provider } = setup();
    await expect(provider.login({ email: OWNER, password: DEMO_PASSWORD })).resolves.toEqual({
      success: true,
      redirectTo: '/login/2fa',
    });
  });

  it('step 1 sends a staff member without 2FA to the setup screen', async () => {
    const { provider } = setup();
    const result = await provider.login({ email: 'nadia@gsm-supply.example', password: DEMO_PASSWORD });
    expect(result).toEqual({ success: true, redirectTo: '/login/setup-2fa' });
  });

  it('step 1 sends a temporary password to the set-password screen', async () => {
    mockServer.use(http.post(`${API}/admin/auth/login`, () => HttpResponse.json({ next: 'password' })));
    const { provider } = setup();
    await expect(provider.login({ email: OWNER, password: 'x' })).resolves.toEqual({
      success: true,
      redirectTo: '/set-password',
    });
  });

  it('treats an unknown answer as "ask for the code", because 2FA is mandatory', async () => {
    mockServer.use(http.post(`${API}/admin/auth/login`, () => new HttpResponse(null, { status: 204 })));
    const { provider } = setup();
    await expect(provider.login({ email: OWNER, password: 'x' })).resolves.toMatchObject({
      redirectTo: '/login/2fa',
    });
  });

  it('returns the ApiError instead of throwing on wrong credentials', async () => {
    const { provider } = setup();
    const result = await provider.login({ email: OWNER, password: 'wrong' });
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ApiError);
    expect(result.error).toMatchObject({ status: 401, code: ERROR_CODES.UNAUTHORIZED });
  });

  it('returns ACCOUNT_SUSPENDED for a suspended account', async () => {
    const { provider } = setup();
    const result = await provider.login({ email: 'yusuf@gsm-supply.example', password: DEMO_PASSWORD });
    expect(result).toMatchObject({ success: false, error: { code: ERROR_CODES.ACCOUNT_SUSPENDED } });
  });

  it('step 2 finishes the sign-in and lands on the start page', async () => {
    const { provider } = setup();
    await provider.login({ email: OWNER, password: DEMO_PASSWORD });
    await expect(provider.login({ code: DEMO_CODE })).resolves.toEqual({
      success: true,
      redirectTo: AUTH_PATHS.home,
    });
  });

  it('step 2 reports a wrong code as a field error', async () => {
    const { provider } = setup();
    await provider.login({ email: OWNER, password: DEMO_PASSWORD });
    const result = await provider.login({ code: '000000' });
    expect(result.success).toBe(false);
    expect((result.error as ApiError).fieldErrors).toHaveProperty('code');
  });

  it('step 2 without step 1 is refused', async () => {
    const { provider } = setup();
    const result = await provider.login({ code: DEMO_CODE });
    expect(result).toMatchObject({ success: false, error: { status: 401 } });
  });
});

describe('check, identity and permissions', () => {
  it('is not authenticated before sign-in and points at the login page', async () => {
    const { provider } = setup();
    const result = await provider.check();
    expect(result).toMatchObject({ authenticated: false, redirectTo: '/login' });
    expect(result.error).toBeInstanceOf(ApiError);
  });

  it('is not authenticated in the half-signed-in step', async () => {
    const { provider } = setup();
    await provider.login({ email: OWNER, password: DEMO_PASSWORD });
    await expect(provider.check()).resolves.toMatchObject({ authenticated: false });
  });

  it('is authenticated after sign-in, and exposes the identity and permissions', async () => {
    const { provider } = setup();
    await signIn(provider);
    await expect(provider.check()).resolves.toEqual({ authenticated: true });
    const me = (await provider.getIdentity!()) as Me;
    expect(me).toMatchObject({ email: OWNER, name: 'Rami K.', role: { name: 'Owner' }, twofaEnabled: true });
    await expect(provider.getPermissions!()).resolves.toEqual(['*']);
  });

  it('gives a non-owner role area permissions from the demo matrix', async () => {
    const { provider } = setup();
    await signIn(provider, 'lina@gsm-supply.example');
    const permissions = (await provider.getPermissions!()) as string[];
    expect(permissions).toContain('support:*');
    expect(permissions).toContain('orders:read');
    expect(permissions).not.toContain('orders:*');
    expect(permissions).not.toContain('staff:read');
  });

  it('calls `me` once for several checks inside the cache lifetime', async () => {
    let calls = 0;
    mockServer.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/admin/auth/me')) calls += 1;
    });
    const { provider } = setup();
    await signIn(provider);
    await provider.check();
    await provider.check();
    await provider.getIdentity!();
    mockServer.events.removeAllListeners();
    expect(calls).toBe(1);
  });

  it('stays signed in when `me` fails for a reason that says nothing about the session', async () => {
    // Network down, a 5xx or a 429: the pages show their own error state with Retry instead of a sign-out.
    for (const fail of [() => HttpResponse.error(), () => new HttpResponse(null, { status: 503 })]) {
      mockServer.use(http.get(`${API}/admin/auth/me`, fail));
      const { provider } = setup();
      await expect(provider.check()).resolves.toMatchObject({ authenticated: true });
    }
  });

  it('sends a suspended account back to the login page with the reason', async () => {
    mockServer.use(
      http.get(`${API}/admin/auth/me`, () =>
        HttpResponse.json({ code: 'ACCOUNT_SUSPENDED', title: 'Suspended' }, { status: 403 }),
      ),
    );
    const { provider } = setup();
    await expect(provider.check()).resolves.toMatchObject({
      authenticated: false,
      redirectTo: '/login?reason=suspended',
    });
  });
});

describe('onError', () => {
  function apiError(status: number, code?: string) {
    return new ApiError({ status, code });
  }

  it('signs out on 401 and forgets the cached identity', async () => {
    const { provider, cache } = setup();
    await signIn(provider);
    await cache.get();
    expect(cache.peek()).toBeDefined();
    await expect(provider.onError(apiError(401, 'UNAUTHORIZED'))).resolves.toMatchObject({
      logout: true,
      redirectTo: '/login',
    });
    expect(cache.peek()).toBeUndefined();
  });

  it('signs out with a reason for a suspended account and a blocked IP', async () => {
    const { provider } = setup();
    await expect(provider.onError(apiError(403, ERROR_CODES.ACCOUNT_SUSPENDED))).resolves.toMatchObject({
      logout: true,
      redirectTo: '/login?reason=suspended',
    });
    await expect(provider.onError(apiError(403, ERROR_CODES.IP_NOT_ALLOWED))).resolves.toMatchObject({
      logout: true,
      redirectTo: '/login?reason=ip',
    });
  });

  it('leaves FORBIDDEN and other errors alone', async () => {
    const { provider } = setup();
    await expect(provider.onError(apiError(403, ERROR_CODES.FORBIDDEN))).resolves.toEqual({});
    await expect(provider.onError(apiError(409, 'CONFLICT'))).resolves.toEqual({});
    await expect(provider.onError(apiError(500))).resolves.toEqual({});
    await expect(provider.onError(new Error('boom'))).resolves.toEqual({});
  });

  it('also reads the status of errors that are not ApiErrors', async () => {
    const { provider } = setup();
    await expect(provider.onError({ statusCode: 401, message: 'x' })).resolves.toMatchObject({
      logout: true,
    });
  });
});

describe('logout', () => {
  it('ends the session on the server, clears the cache and redirects to login', async () => {
    const { provider } = setup();
    await signIn(provider);
    await expect(provider.logout({})).resolves.toEqual({ success: true, redirectTo: '/login' });
    await expect(provider.check()).resolves.toMatchObject({ authenticated: false });
  });

  it('counts an already ended session (401) as signed out', async () => {
    const { provider } = setup();
    await expect(provider.logout({})).resolves.toMatchObject({ success: true, redirectTo: '/login' });
  });

  it('does not count a CSRF refusal as signed out', async () => {
    const { provider } = setup();
    await signIn(provider);
    mockServer.use(
      http.post(`${API}/admin/auth/logout`, () =>
        HttpResponse.json({ code: 'CSRF_FAILED', title: 'CSRF check failed' }, { status: 403 }),
      ),
    );
    await expect(provider.logout({})).resolves.toMatchObject({ success: false, error: { status: 403 } });
    mockServer.resetHandlers();
    await expect(provider.check()).resolves.toEqual({ authenticated: true });
  });

  it('keeps the user signed in and reports the error when the server cannot be reached', async () => {
    const { provider } = setup();
    await signIn(provider);
    mockServer.use(http.post(`${API}/admin/auth/logout`, () => HttpResponse.error()));
    const result = await provider.logout({});
    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({ code: ERROR_CODES.NETWORK_ERROR });
    mockServer.resetHandlers();
    await expect(provider.check()).resolves.toEqual({ authenticated: true });
  });
});

describe('updatePassword', () => {
  it('sets the password from an invite link and redirects to login with the reason', async () => {
    const { provider } = setup();
    await expect(
      provider.updatePassword!({ token: DEMO_INVITE_TOKEN, password: 'a-long-enough-password' }),
    ).resolves.toEqual({ success: true, redirectTo: '/login?reason=password-set' });
  });

  it('reports a weak password and an invalid token', async () => {
    const { provider } = setup();
    await expect(
      provider.updatePassword!({ token: DEMO_INVITE_TOKEN, password: 'short' }),
    ).resolves.toMatchObject({
      success: false,
      error: { code: ERROR_CODES.WEAK_PASSWORD },
    });
    await expect(
      provider.updatePassword!({ token: 'old', password: 'a-long-enough-password' }),
    ).resolves.toMatchObject({
      success: false,
      error: { code: ERROR_CODES.TOKEN_INVALID },
    });
  });

  it('works without a token for a temporary password, using the half-signed-in session', async () => {
    const { provider } = setup();
    await provider.login({ email: OWNER, password: DEMO_PASSWORD });
    await expect(provider.updatePassword!({ password: 'a-long-enough-password' })).resolves.toMatchObject({
      success: true,
    });
  });
});

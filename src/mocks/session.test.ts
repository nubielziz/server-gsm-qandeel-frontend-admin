// Tests for the mock sign-in routes: steps, CSRF, session and password set.
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, forgetCsrfToken } from '@/lib/api';
import { Collection } from './db';
import { crudHandlers } from './crud';
import { handlers, resetMockState } from './handlers';
import { DEMO_CODE, DEMO_INVITE_TOKEN, DEMO_PASSWORD, guard } from './session';

const API = 'http://api.test';
const server = setupServer(
  ...handlers,
  ...crudHandlers({ base: '/admin/things', collection: new Collection([{ id: 1 }]) }),
  http.get('*/admin/open', ({ request }) => guard(request) ?? Response.json({ ok: true })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', API));
afterEach(() => {
  resetMockState();
  forgetCsrfToken();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

async function signIn(email = 'rami@gsm-supply.example') {
  await apiPost('/admin/auth/login', { email, password: DEMO_PASSWORD });
  await apiPost('/admin/auth/2fa', { code: DEMO_CODE });
}

describe('sign-in routes', () => {
  it('rejects empty credentials with field errors', async () => {
    const error = await apiPost('/admin/auth/login', {}).catch((e: unknown) => e);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fieldErrors: { email: ['Enter your email.'], password: ['Enter your password.'] },
    });
  });

  it('does not tell an unknown email from a wrong password', async () => {
    const unknown = await apiPost('/admin/auth/login', {
      email: 'nobody@x.test',
      password: DEMO_PASSWORD,
    }).catch((e: unknown) => e);
    const wrong = await apiPost('/admin/auth/login', {
      email: 'rami@gsm-supply.example',
      password: 'nope',
    }).catch((e: unknown) => e);
    expect(unknown).toMatchObject({ status: 401, detail: 'The email or password is not correct.' });
    expect(wrong).toMatchObject({ status: 401, detail: 'The email or password is not correct.' });
  });

  it('matches the email without regard to case and spaces', async () => {
    await expect(
      apiPost('/admin/auth/login', { email: '  RAMI@gsm-supply.EXAMPLE ', password: DEMO_PASSWORD }),
    ).resolves.toEqual({ next: 'totp' });
  });

  it('gives the first-time setup a secret, an otpauth URL and an SVG', async () => {
    await apiPost('/admin/auth/login', { email: 'nadia@gsm-supply.example', password: DEMO_PASSWORD });
    const setup = await apiPost<{ secret: string; otpauthUrl: string; qrSvg: string }>(
      '/admin/auth/2fa/setup',
    );
    expect(setup.secret).toMatch(/^[A-Z2-7]{16}$/);
    expect(setup.otpauthUrl).toContain(`secret=${setup.secret}`);
    expect(setup.otpauthUrl).toContain('nadia%40gsm-supply.example');
    expect(setup.qrSvg.startsWith('<svg')).toBe(true);
    await apiPost('/admin/auth/2fa', { code: DEMO_CODE });
    const me = await apiGet<{ twofaEnabled: boolean }>('/admin/auth/me');
    expect(me.twofaEnabled).toBe(true);
  });

  it('refuses the setup route without the password step', async () => {
    await expect(apiPost('/admin/auth/2fa/setup')).rejects.toMatchObject({ status: 401 });
  });

  it('answers me with the role, permissions and last sign-in', async () => {
    await signIn('omar@gsm-supply.example');
    const me = await apiGet<Record<string, unknown>>('/admin/auth/me');
    expect(me).toMatchObject({
      email: 'omar@gsm-supply.example',
      status: 'active',
      role: { id: 3, name: 'Finance' },
      mustChangePassword: false,
    });
    expect(me.permissions).toEqual(
      expect.arrayContaining(['ledger:*', 'payments:*', 'orders:read', 'dashboard:read']),
    );
    expect(me.permissions).not.toContain('staff:read');
    expect(typeof me.lastLoginAt).toBe('string');
  });

  it('does not allow me before the code is entered, and not after sign-out', async () => {
    await apiPost('/admin/auth/login', { email: 'rami@gsm-supply.example', password: DEMO_PASSWORD });
    await expect(apiGet('/admin/auth/me')).rejects.toMatchObject({ status: 401 });
    await apiPost('/admin/auth/2fa', { code: DEMO_CODE });
    await expect(apiGet('/admin/auth/me')).resolves.toBeDefined();
    await apiPost('/admin/auth/logout');
    await expect(apiGet('/admin/auth/me')).rejects.toMatchObject({ status: 401 });
  });

  it('checks the set-password token and the password length', async () => {
    await expect(
      apiPost('/admin/auth/password/set', { token: 'nope', password: 'long-enough-pass' }),
    ).rejects.toMatchObject({
      status: 410,
      code: 'TOKEN_INVALID',
    });
    await expect(
      apiPost('/admin/auth/password/set', { token: DEMO_INVITE_TOKEN, password: 'short' }),
    ).rejects.toMatchObject({
      status: 422,
      code: 'WEAK_PASSWORD',
      fieldErrors: { password: ['Use at least 10 characters.'] },
    });
    await expect(
      apiPost('/admin/auth/password/set', { token: DEMO_INVITE_TOKEN, password: 'long-enough-pass' }),
    ).resolves.toBeUndefined();
  });
});

describe('the guard and CSRF', () => {
  it('answers 401 when nobody is signed in', async () => {
    await expect(apiGet('/admin/things')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    await expect(apiGet('/admin/open')).rejects.toMatchObject({ status: 401 });
  });

  it('lets a signed-in staff member read and write', async () => {
    await signIn();
    await expect(apiGet('/admin/things')).resolves.toEqual([{ id: 1 }]);
    await expect(apiPost('/admin/things', { x: 1 })).resolves.toMatchObject({ id: 2 });
    await expect(apiGet('/admin/open')).resolves.toEqual({ ok: true });
  });

  it('refuses a mutation without the matching CSRF token', async () => {
    await signIn();
    forgetCsrfToken();
    document.cookie = 'csrf_token=; path=/; max-age=0';
    await expect(apiPost('/admin/things', { x: 1 })).rejects.toMatchObject({
      status: 403,
      code: 'CSRF_FAILED',
    });
    // Reading needs no token.
    await expect(apiGet('/admin/things')).resolves.toBeDefined();
  });

  it('refuses a wrong CSRF token', async () => {
    await signIn();
    document.cookie = 'csrf_token=wrong; path=/';
    await expect(apiPost('/admin/things', {})).rejects.toMatchObject({ status: 403, code: 'CSRF_FAILED' });
  });

  it('sets a readable cookie named by VITE_CSRF_COOKIE', async () => {
    vi.stubEnv('VITE_CSRF_COOKIE', 'my_csrf');
    await apiPost('/admin/auth/login', { email: 'rami@gsm-supply.example', password: DEMO_PASSWORD });
    expect(document.cookie).toMatch(/my_csrf=\w+/);
    document.cookie = 'my_csrf=; path=/; max-age=0';
  });
});

describe('session storage', () => {
  it('keeps the session in localStorage so a reload stays signed in', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    });
    await signIn();
    expect(JSON.parse(data.get('gsm-mock-session')!)).toMatchObject({ stage: 'signed-in' });
    // A reload keeps localStorage and the cookie but loses the client's memory.
    forgetCsrfToken();
    await expect(apiGet('/admin/auth/me')).resolves.toMatchObject({ email: 'rami@gsm-supply.example' });
    await expect(apiPost('/admin/things', {})).resolves.toBeDefined();
    await apiPost('/admin/auth/logout');
    expect(data.has('gsm-mock-session')).toBe(false);
  });
});

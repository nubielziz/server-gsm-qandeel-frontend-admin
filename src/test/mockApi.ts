// Test helpers for the dev mock API (`mockServer`): start it, reset it, sign a staff member in, answer `me`.
// Import them from tests only.
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { meCache } from '@/app/providers/meCache';
import type { Me } from '@/features/auth';
import { apiPost, forgetCsrfToken } from '@/lib/api';
import { resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';
import { DEMO_CODE, DEMO_PASSWORD, startSignedInSession } from '@/mocks/session';

export const API = 'http://api.test';
export const OWNER = 'rami@gsm-supply.example';
export { DEMO_CODE, DEMO_PASSWORD };

/** Starts the mock API for a test file and puts every shared store back after each test. Call it once at the top. */
export function setupMockApi(): void {
  beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', API));
  afterEach(() => {
    mockServer.resetHandlers();
    resetMockState();
    forgetCsrfToken();
    meCache.clear();
    vi.unstubAllEnvs();
  });
  afterAll(() => mockServer.close());
}

/** Signs a seeded staff member in through the mock API, so the app starts with a session. */
export async function signInAs(email = OWNER): Promise<void> {
  await apiPost('/admin/auth/login', { email, password: DEMO_PASSWORD });
  await apiPost('/admin/auth/2fa', { code: DEMO_CODE });
}

/**
 * Answers `GET /admin/auth/me` with this staff member, whatever the mock session says. It also starts a signed-in mock
 * session (the seeded owner), so the shell's own data calls (the sidebar counts) are answered rather than refused with
 * a 401 that would sign the test user out. The mock server does not check permissions: `me` is what the UI sees.
 */
export function mockMe(overrides: Partial<Me>): void {
  startSignedInSession();
  const me: Me = {
    id: 99,
    email: 'tester@gsm-supply.example',
    name: 'Test Operator',
    status: 'active',
    role: { id: 9, name: 'Tester' },
    permissions: ['*'],
    twofaEnabled: true,
    mustChangePassword: false,
    lastLoginAt: null,
    lastLoginIp: null,
    ...overrides,
  };
  mockServer.use(http.get('*/admin/auth/me', () => HttpResponse.json(me)));
}

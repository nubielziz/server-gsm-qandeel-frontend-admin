// Mock of the sign-in routes (`/admin/auth/*`): password -> authenticator code -> signed in, first-time setup,
// set-password and sign-out, plus the guard other mock handlers use to answer 401/403 like the real API.
//
// Demo credentials: any seeded admin with password `demo-password`, authenticator code `123456`, invite token
// `demo-token`. Rami (owner) signs in normally, Nadia (invited, no 2FA yet) goes through the first-time setup and
// Yusuf is suspended. The session lives in localStorage, so a page reload stays signed in.
import { http, HttpResponse } from 'msw';
import type { Me, SetPasswordBody } from '@/features/auth';
import { csrfCookieName } from '@/lib/api/config';
import { latency } from './latency';
import { problem } from './problem';
import { permissionsOf, roleOf } from './roles';
import { staffStore, type MockStaff } from './staff';

export const DEMO_PASSWORD = 'demo-password';
export const DEMO_CODE = '123456';
export const DEMO_INVITE_TOKEN = 'demo-token';
const MIN_PASSWORD_LENGTH = 10;
const STORAGE_KEY = 'gsm-mock-session';
const FAKE_SECRET = 'JBSWY3DPEHPK3PXP';

/** `password`: the password step is done and the code is missing. `signed-in`: fully signed in. */
type Session = { staffId: number; stage: 'password' | 'signed-in'; csrf: string };

// localStorage in a browser; a plain map where it is missing or blocked (a bare Node run, private mode).
const memory = new Map<string, string>();
function webStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
const storage = {
  get: (key: string): string | null => webStorage()?.getItem(key) ?? memory.get(key) ?? null,
  set: (key: string, value: string): void => {
    const web = webStorage();
    if (web) web.setItem(key, value);
    else memory.set(key, value);
  },
  remove: (key: string): void => {
    webStorage()?.removeItem(key);
    memory.delete(key);
  },
};

function readSession(): Session | undefined {
  const raw = storage.get(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return undefined;
  }
}

function writeSession(session: Session | undefined): void {
  if (session) storage.set(STORAGE_KEY, JSON.stringify(session));
  else storage.remove(STORAGE_KEY);
}

// A real server sets this cookie; a mocked response cannot, so the handler writes it on the page itself.
function setCsrfCookie(token: string | undefined): void {
  if (typeof document === 'undefined') return;
  const name = csrfCookieName();
  document.cookie = token ? `${name}=${token}; path=/; SameSite=Lax` : `${name}=; path=/; max-age=0`;
}

/** Signs everyone out and clears the CSRF cookie (sign-out, and between tests). */
export function resetSession(): void {
  writeSession(undefined);
  setCsrfCookie(undefined);
}

function newToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// The token also goes out as a header: browsers drop cookies set by mocked responses, and the client falls back to it.
function csrfHeaders(csrf: string): HeadersInit {
  return { 'X-CSRF-Token': csrf };
}

function isMutation(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

/**
 * The session when it is at one of `stages` and, for mutations, the CSRF header matches it.
 * Otherwise the problem response to return (401 when not signed in, 403 `CSRF_FAILED` on a bad token).
 */
function requireSession(request: Request, stages: Session['stage'][]): Session | Response {
  const session = readSession();
  if (!session || !stages.includes(session.stage)) {
    return problem(401, 'UNAUTHORIZED', 'Not signed in', 'Sign in to continue.');
  }
  if (isMutation(request.method) && request.headers.get('X-CSRF-Token') !== session.csrf) {
    return problem(403, 'CSRF_FAILED', 'CSRF check failed', 'The CSRF token is missing or does not match.');
  }
  return session;
}

/**
 * Guard for other mock handlers: a problem response to return as it is, or null when the request may continue.
 * Needs a fully signed-in session; mutations also need the matching `X-CSRF-Token` header.
 */
export function guard(request: Request): Response | null {
  const result = requireSession(request, ['signed-in']);
  return result instanceof Response ? result : null;
}

async function readBody<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return {};
  }
}

function toMe(staff: MockStaff): Me {
  const { id, name } = roleOf(staff.role);
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    status: staff.status,
    role: { id, name },
    permissions: permissionsOf(staff.role),
    twofaEnabled: staff.twofaEnabled,
    mustChangePassword: staff.mustChangePassword,
    lastLoginAt: staff.lastLoginAt,
    lastLoginIp: staff.lastLoginIp,
  };
}

// A QR-looking image for the first-time setup screen: three finder squares and pseudo-random modules from the secret.
// It does not scan; the screen also shows the secret as text.
function fakeQrSvg(seed: string): string {
  const size = 25;
  let state = [...seed].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
  const finderOn = (x: number, y: number) => {
    const dx = x < 7 ? x : x >= size - 7 ? x - (size - 7) : 0;
    const dy = y < 7 ? y : y >= size - 7 ? y - (size - 7) : 0;
    const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
    return ring !== 2;
  };
  const cells: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = finder(x, y) ? finderOn(x, y) : random() < 0.5;
      if (on) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${size + 2}" height="${size + 2}" fill="#fff"/><path d="${cells.join('')}" fill="#000"/></svg>`;
}

export const sessionHandlers = [
  // Step 1: email and password. The answer says which screen comes next.
  http.post('*/admin/auth/login', async ({ request }) => {
    await latency();
    const { email, password } = await readBody<{ email: string; password: string }>(request);
    const missing = [
      ...(email ? [] : [{ field: 'email', message: 'Enter your email.' }]),
      ...(password ? [] : [{ field: 'password', message: 'Enter your password.' }]),
    ];
    if (!email || !password) {
      return problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', missing);
    }
    const staff = (await staffStore())
      .list()
      .find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (!staff || password !== DEMO_PASSWORD) {
      return problem(401, 'UNAUTHORIZED', 'Sign-in failed', 'The email or password is not correct.');
    }
    if (staff.status === 'suspended') {
      return problem(
        403,
        'ACCOUNT_SUSPENDED',
        'Account suspended',
        'This account is suspended. Ask an owner to reactivate it.',
      );
    }
    const csrf = newToken();
    writeSession({ staffId: staff.id, stage: 'password', csrf });
    setCsrfCookie(csrf);
    const next = staff.mustChangePassword ? 'password' : staff.twofaEnabled ? 'totp' : 'totp_setup';
    return HttpResponse.json({ next }, { headers: csrfHeaders(csrf) });
  }),

  // Step 2: the authenticator code completes the sign-in.
  http.post('*/admin/auth/2fa', async ({ request }) => {
    await latency();
    const session = requireSession(request, ['password']);
    if (session instanceof Response) return session;
    const { code } = await readBody<{ code: string }>(request);
    if (code !== DEMO_CODE) {
      const message = 'The code is not correct or has expired.';
      return problem(422, 'VALIDATION_FAILED', 'Invalid code', message, [{ field: 'code', message }]);
    }
    (await staffStore()).patch(session.staffId, {
      twofaEnabled: true,
      lastLoginAt: new Date().toISOString(),
    });
    writeSession({ ...session, stage: 'signed-in' });
    return new HttpResponse(null, { status: 204, headers: csrfHeaders(session.csrf) });
  }),

  // First sign-in: the secret and QR code to scan before entering the first code.
  http.post('*/admin/auth/2fa/setup', async ({ request }) => {
    await latency();
    const session = requireSession(request, ['password']);
    if (session instanceof Response) return session;
    const staff = (await staffStore()).find(session.staffId);
    const account = encodeURIComponent(staff?.email ?? 'staff');
    return HttpResponse.json({
      secret: FAKE_SECRET,
      otpauthUrl: `otpauth://totp/GSM%20Supply:${account}?secret=${FAKE_SECRET}&issuer=GSM%20Supply`,
      qrSvg: fakeQrSvg(FAKE_SECRET),
    });
  }),

  http.post('*/admin/auth/logout', async ({ request }) => {
    await latency();
    const session = requireSession(request, ['password', 'signed-in']);
    if (session instanceof Response) return session;
    resetSession();
    return new HttpResponse(null, { status: 204 });
  }),

  // The signed-in staff member with role and permissions.
  http.get('*/admin/auth/me', async ({ request }) => {
    await latency();
    const session = requireSession(request, ['signed-in']);
    if (session instanceof Response) return session;
    const staff = (await staffStore()).find(session.staffId);
    if (!staff) return problem(401, 'UNAUTHORIZED', 'Not signed in', 'This account no longer exists.');
    if (staff.status === 'suspended') {
      return problem(403, 'ACCOUNT_SUSPENDED', 'Account suspended', 'This account is suspended.');
    }
    return HttpResponse.json(toMe(staff), { headers: csrfHeaders(session.csrf) });
  }),

  // Invite and reset links send a one-time token; a temporary password uses the half-signed-in session instead.
  http.post('*/admin/auth/password/set', async ({ request }) => {
    await latency();
    const { token, password } = await readBody<SetPasswordBody>(request);
    let staffId: number | undefined;
    if (token !== undefined) {
      if (token !== DEMO_INVITE_TOKEN) {
        return problem(
          410,
          'TOKEN_INVALID',
          'Link no longer valid',
          'This link has expired or was already used. Ask an owner for a new one.',
        );
      }
    } else {
      const session = requireSession(request, ['password']);
      if (session instanceof Response) return session;
      staffId = session.staffId;
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      const message = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
      return problem(422, 'WEAK_PASSWORD', 'Password too weak', message, [{ field: 'password', message }]);
    }
    if (staffId !== undefined) {
      (await staffStore()).patch(staffId, { mustChangePassword: false });
      resetSession();
    }
    return new HttpResponse(null, { status: 204 });
  }),
];

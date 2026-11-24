// Mock of the staff security tools on an account (`POST /admin/clients/:id/password|reset-2fa|sessions/revoke|verify-email/resend`). The mock
// keeps the Security part's facts in step (a temporary password, two-step sign-in off, no sessions, the time a link went out) and refuses
// what the server refuses: a guest (`NO_ACCOUNT`), an account that is not active (`NOT_ACTIVE`), two-step sign-in that is off
// (`TWOFA_NOT_ENABLED`), an email that is already verified (`CONFLICT`). The real rules, the mails and the 429 limit are the server's
// (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import { context, temporaryPassword } from './context';
import { endSessions } from './links';
import { bodyOf, idOf, invalid, noContent, notFound, route } from './shared';
import type { MockAccount } from './types';

const notActive = () =>
  problem(409, 'NOT_ACTIVE', 'Not active', 'This account is not active. Reactivate the account first.');

// Looks the account up for one of the four actions, refuses a guest, then runs it.
function accountAction(
  path: string,
  run: (account: MockAccount, body: Record<string, unknown>) => Response | Promise<Response>,
): HttpHandler {
  return route('post', `/admin/clients/:id/${path}`, async (call) => {
    const { state } = await context();
    const account = state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    if (account.status === 'anonymized') {
      return problem(
        409,
        'ANONYMIZED',
        'Account removed',
        'This account was anonymized. Nothing can change.',
      );
    }
    if (!account.hasAccount) {
      return problem(409, 'NO_ACCOUNT', 'No login', 'A guest has no login. Make an account first.');
    }
    return run(account, await bodyOf(call.request));
  });
}

export const securityRoutes: HttpHandler[] = [
  accountAction('password', async (account, body) => {
    const mode = body.mode;
    if (mode !== 'reset_link' && mode !== 'temporary_password') {
      return invalid([{ field: 'mode', message: 'Choose a link or a temporary password.' }]);
    }
    if (account.status !== 'active') return notActive();
    const { state } = await context();
    const now = toIso(Date.now());
    if (body.revokeSessions === true) await endSessions(account.id);
    const sessions = body.revokeSessions === true ? { activeSessions: 0 } : {};
    const headers = { 'Cache-Control': 'no-store' };
    if (mode === 'reset_link') {
      state.accounts.patch(account.id, { security: { ...account.security, ...sessions, linkSentAt: now } });
      return HttpResponse.json({ link: account.security.hasPassword ? 'reset' : 'invite' }, { headers });
    }
    state.accounts.patch(account.id, {
      security: {
        ...account.security,
        ...sessions,
        hasPassword: true,
        mustChangePassword: true,
        passwordChangedAt: now,
        linkSentAt: null,
      },
    });
    return HttpResponse.json({ temporaryPassword: temporaryPassword() }, { headers });
  }),

  accountAction('reset-2fa', async (account) => {
    if (!account.security.twofaEnabled) {
      return problem(
        409,
        'TWOFA_NOT_ENABLED',
        'Two-step sign-in is off',
        'This account has not turned on two-step sign-in.',
      );
    }
    const { state } = await context();
    await endSessions(account.id);
    state.accounts.patch(account.id, {
      security: { ...account.security, twofaEnabled: false, activeSessions: 0 },
    });
    return noContent();
  }),

  accountAction('sessions/revoke', async (account) => {
    const { state } = await context();
    await endSessions(account.id);
    state.accounts.patch(account.id, { security: { ...account.security, activeSessions: 0 } });
    return noContent();
  }),

  accountAction('verify-email/resend', async (account) => {
    if (account.emailVerifiedAt) {
      return problem(409, 'CONFLICT', 'Already verified', 'This email address is already verified.');
    }
    if (account.status !== 'active') return notActive();
    const { state } = await context();
    state.accounts.patch(account.id, {
      security: { ...account.security, verificationSentAt: toIso(Date.now()) },
    });
    return noContent();
  }),
];

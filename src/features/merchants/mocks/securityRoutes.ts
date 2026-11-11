// Mock of the staff security tools on a merchant (`POST /admin/clients/:id/password|reset-2fa|sessions/revoke|verify-email/resend`).
// The mock keeps the Security tab's facts in step (a temporary password, 2FA off, no sessions, the time a link went out) and
// refuses what the server refuses: a suspended merchant (`NOT_ACTIVE`), 2FA that is off (`TWOFA_NOT_ENABLED`), an email that is
// already verified (`CONFLICT`). The real rules, the mails and the 429 limit are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import { sessionStore } from '@/mocks/sessions';
import { bodyOf, idOf, invalid, noContent, notFound, route } from './shared';
import { merchantStore, type MockClient } from './store';

// A password the way the server would generate one (14 characters, no look-alikes).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const temporaryPassword = () =>
  Array.from({ length: 14 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** Ends every open session of a merchant and says how many there were. */
async function endSessions(clientId: number): Promise<number> {
  const sessions = await sessionStore();
  const open = sessions
    .list()
    .filter((session) => session.subjectType === 'client' && session.subject.id === clientId);
  for (const session of open) sessions.remove(session.id);
  return open.length;
}

const suspended = () =>
  problem(409, 'NOT_ACTIVE', 'Not active', 'This merchant is suspended. Reactivate the account first.');

// Looks the merchant up for one of the four actions, then runs it.
function clientAction(
  path: string,
  run: (client: MockClient, body: Record<string, unknown>) => Response | Promise<Response>,
): HttpHandler {
  return route('post', `/admin/clients/:id/${path}`, async (call) => {
    const store = await merchantStore();
    const client = store.clients.find(idOf(call));
    if (!client) return notFound('merchant', call.params.id);
    return run(client, await bodyOf(call.request));
  });
}

export const securityRoutes: HttpHandler[] = [
  clientAction('password', async (client, body) => {
    const mode = body.mode;
    if (mode !== 'reset_link' && mode !== 'temporary_password') {
      return invalid([{ field: 'mode', message: 'Choose a link or a temporary password.' }]);
    }
    if (client.status === 'suspended') return suspended();
    const store = await merchantStore();
    const now = toIso(Date.now());
    if (body.revokeSessions === true) await endSessions(client.id);
    const headers = { 'Cache-Control': 'no-store' };
    if (mode === 'reset_link') {
      store.clients.patch(client.id, { security: { ...client.security, linkSentAt: now } });
      return HttpResponse.json({ link: client.security.hasPassword ? 'reset' : 'invite' }, { headers });
    }
    store.clients.patch(client.id, {
      security: {
        ...client.security,
        hasPassword: true,
        mustChangePassword: true,
        passwordChangedAt: now,
        linkSentAt: null,
      },
    });
    return HttpResponse.json({ temporaryPassword: temporaryPassword() }, { headers });
  }),

  clientAction('reset-2fa', async (client) => {
    if (!client.security.twofaEnabled) {
      return problem(409, 'TWOFA_NOT_ENABLED', 'Two-factor is off', 'This merchant has not turned on 2FA.');
    }
    const store = await merchantStore();
    await endSessions(client.id);
    store.clients.patch(client.id, { security: { ...client.security, twofaEnabled: false } });
    return noContent();
  }),

  clientAction('sessions/revoke', async (client) => {
    await endSessions(client.id);
    return noContent();
  }),

  clientAction('verify-email/resend', async (client) => {
    if (client.emailVerifiedAt) {
      return problem(409, 'CONFLICT', 'Already verified', 'This email address is already verified.');
    }
    if (client.status === 'suspended') return suspended();
    const store = await merchantStore();
    store.clients.patch(client.id, {
      security: { ...client.security, verificationSentAt: toIso(Date.now()) },
    });
    return noContent();
  }),
];

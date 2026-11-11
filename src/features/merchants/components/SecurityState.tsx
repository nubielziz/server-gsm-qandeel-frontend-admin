// SecurityState: the sign-in facts of a merchant on the Security tab (feature 20): password, 2FA, email verification, last sign-in,
// the open link and the number of open sessions. Everything comes from `client.security`, worked out by the server.
import { Badge, KeyValue } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import type { Client, ClientSecurity } from '../types';

// "Set", "Not set yet (invitation)" or "Temporary (must change at next sign-in)", the last one in the warning colour.
function PasswordCell({ security }: { security: ClientSecurity }) {
  if (!security.hasPassword) return <>Not set yet (invitation)</>;
  if (security.mustChangePassword) {
    return <span className="font-medium text-warn-fg">Temporary (must change at next sign-in)</span>;
  }
  return <>Set</>;
}

// Verified, or not verified with when the open verification link went out.
function EmailCell({ client, now }: { client: Client; now: number }) {
  if (client.emailVerifiedAt) {
    return (
      <>
        <Badge tone="good" icon="checkCircle">
          Verified
        </Badge>{' '}
        <span className="text-ink3">{fmtDate(client.emailVerifiedAt)}</span>
      </>
    );
  }
  const sent = client.security?.verificationSentAt;
  return (
    <>
      <Badge tone="neutral" icon="clock">
        Not verified
      </Badge>
      {sent && <span className="ms-1.5 text-ink2">Verification sent {ago(sent, now)}</span>}
    </>
  );
}

/** The read-only facts. Without `security` (the server did not send it) a note says so instead of showing wrong values. */
export function SecurityState({ client, now }: { client: Client; now: number }) {
  const security = client.security;
  if (!security) {
    return <p className="text-sm text-ink3">The server did not send the sign-in details of this merchant.</p>;
  }
  return (
    <KeyValue
      rows={[
        ['Password', <PasswordCell key="p" security={security} />],
        [
          'Password changed',
          security.passwordChangedAt ? (
            ago(security.passwordChangedAt, now)
          ) : (
            <span className="text-ink3">Never</span>
          ),
        ],
        ['Two-factor (2FA)', security.twofaEnabled ? 'On' : 'Off'],
        ['Email', <EmailCell key="e" client={client} now={now} />],
        [
          'Last sign-in',
          security.lastLoginAt ? (
            <>
              {ago(security.lastLoginAt, now)}
              {security.lastLoginIp && (
                <>
                  {' '}
                  from <span className="mono">{security.lastLoginIp}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-ink3">Never</span>
          ),
        ],
        security.linkSentAt ? ['Link', `Link sent ${ago(security.linkSentAt, now)}, works for 1 hour`] : null,
        [
          'Active sessions',
          security.activeSessions > 0 ? (
            security.activeSessions
          ) : (
            <span className="text-ink3">No active sessions</span>
          ),
        ],
      ]}
    />
  );
}

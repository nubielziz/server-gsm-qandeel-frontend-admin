// SecurityActions: the buttons of the Security tab: Password…, Sign out everywhere, Reset 2FA… and Resend verification email. Each
// needs `clients:security`; a button is also off when there is nothing to do (no sessions, 2FA already off, email already verified).
import { Button, Icon } from '@/components/ui';
import { useResendClientVerification } from '../hooks/useSecurityMutations';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { Client } from '../types';

export interface SecurityActionsProps {
  client: Client;
  grants: MerchantGrants;
  onPassword: () => void;
  onSignOut: () => void;
  onReset2fa: () => void;
}

/** The title of a button that is off for a reason other than the permission. */
const unless = (lock: { title?: string }, off: boolean, why: string) => lock.title ?? (off ? why : undefined);

export function SecurityActions({ client, grants, onPassword, onSignOut, onReset2fa }: SecurityActionsProps) {
  const lock = grants.needs('clients:security');
  const resend = useResendClientVerification();
  const security = client.security;
  const noSessions = (security?.activeSessions ?? 0) === 0;
  const no2fa = !security?.twofaEnabled;
  const verified = Boolean(client.emailVerifiedAt);

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={lock.disabled} title={lock.title} onClick={onPassword}>
        <Icon name="lock" className="ic-sm" />
        Password…
      </Button>
      <Button
        disabled={lock.disabled || noSessions}
        title={unless(lock, noSessions, 'No active sessions')}
        onClick={onSignOut}
      >
        <Icon name="upload" className="ic-sm" />
        Sign out everywhere
      </Button>
      <Button
        disabled={lock.disabled || no2fa}
        title={unless(lock, no2fa, '2FA is already off')}
        onClick={onReset2fa}
      >
        <Icon name="shield" className="ic-sm" />
        Reset 2FA…
      </Button>
      <Button
        disabled={lock.disabled || verified}
        title={unless(lock, verified, 'The email is already verified')}
        loading={resend.isPending}
        onClick={() => resend.mutate(client)}
      >
        <Icon name="mail" className="ic-sm" />
        Resend verification email
      </Button>
    </div>
  );
}

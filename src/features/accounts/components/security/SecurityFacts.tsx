// SecurityFacts: the read-only rows of the Security part: the password, when it changed, two-step sign-in, the email, the last sign-in and
// the address it came from, the open link and the number of open sessions. Everything comes from `account.security`, worked out by the
// server; this file only words it. The count of sessions is a number, never a list of devices.
import { useState } from 'react';
import { BlockIpDialog } from '@/features/access';
import { FormRow, ReadValue, StatusSquare } from '@/components/ui';
import { ago } from '@/lib/format';
import { accountLabel } from '../shared/accountLabel';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { AccountDetail } from '../../types';
import { LastSeenFrom } from './LastSeenFrom';
import {
  blockIpNote,
  dayText,
  LAST_SEEN_SCOPE,
  lastSeenIp,
  lastSignIn,
  linkText,
  passwordText,
  verificationText,
} from './securityText';

export interface SecurityFactsProps {
  account: AccountDetail;
  grants: AccountGrants;
  /** The clock the relative times are counted from (`useNow`), so the rows and their tests agree. */
  now: number;
}

const Never = () => <span className="text-ink3">Never</span>;
const Note = ({ children }: { children: string }) => (
  <span className="text-xs italic text-ink3">{children}</span>
);

/** The rows, and the "Block IP…" dialog they can open. Without `security` in the answer one line says so, instead of wrong values. */
export function SecurityFacts({ account, grants, now }: SecurityFactsProps) {
  const [blocking, setBlocking] = useState(false);
  const security = account.security;
  if (!security) {
    return (
      <p className="py-2.5 text-sm text-ink3">The server did not send the sign-in details of this account.</p>
    );
  }
  const password = passwordText(security);
  const signIn = lastSignIn(security, now);
  const link = linkText(security, now);
  const sent = verificationText(security, now);
  const ip = lastSeenIp(account);

  return (
    <>
      <FormRow label="Password">
        <ReadValue className="flex-wrap gap-x-2">
          <span className={password.warn ? 'font-medium text-warn-fg' : undefined}>{password.text}</span>
          {password.note && <Note>{password.note}</Note>}
        </ReadValue>
      </FormRow>
      <FormRow label="Password changed">
        <ReadValue>{security.passwordChangedAt ? ago(security.passwordChangedAt, now) : <Never />}</ReadValue>
      </FormRow>
      <FormRow label="Two-step sign-in">
        <ReadValue>{security.twofaEnabled ? 'On' : 'Off'}</ReadValue>
      </FormRow>
      <FormRow label="Email">
        <ReadValue className="flex-wrap gap-x-2">
          <span>{account.email}</span>
          {account.emailVerifiedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <StatusSquare tone="ok" label="Verified" />
              <span>Verified</span>
              <span className="text-ink3">{dayText(account.emailVerifiedAt)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <StatusSquare tone="off" label="Not verified" />
              <span>Not verified</span>
              {sent && <Note>{sent}</Note>}
            </span>
          )}
        </ReadValue>
      </FormRow>
      <FormRow label="Last sign-in">
        <ReadValue>
          {signIn.age ? (
            <span>
              {signIn.age}
              {signIn.ip && (
                <>
                  {' '}
                  from <span className="mono">{signIn.ip}</span>
                </>
              )}
            </span>
          ) : (
            <Never />
          )}
        </ReadValue>
      </FormRow>
      <FormRow label="Last seen from">
        <ReadValue>
          <LastSeenFrom
            ip={ip}
            scope={LAST_SEEN_SCOPE}
            canCheck={grants.can('access:read')}
            lock={grants.needs('access:create')}
            onBlock={() => setBlocking(true)}
          />
        </ReadValue>
      </FormRow>
      {link && (
        <FormRow label="Link">
          <ReadValue>{link}</ReadValue>
        </FormRow>
      )}
      <FormRow label="Active sessions">
        <ReadValue muted={security.activeSessions === 0}>
          {security.activeSessions > 0 ? security.activeSessions : 'No active sessions'}
        </ReadValue>
      </FormRow>
      {blocking && ip && (
        <BlockIpDialog
          ip={ip}
          scope={LAST_SEEN_SCOPE}
          who={accountLabel(account)}
          note={blockIpNote(account) ?? undefined}
          onClose={() => setBlocking(false)}
        />
      )}
    </>
  );
}

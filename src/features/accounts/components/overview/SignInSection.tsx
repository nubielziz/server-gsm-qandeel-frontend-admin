// SignInSection: how the account signs in: a working login, an invitation nobody used yet, or none (a guest, who follows their orders from
// the link in their email). A guest can be given a login from here ("Make an account…").
import { Button, FormRow, SectionHeading } from '@/components/ui';
import { actionOffer } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { OpenAction } from '../types';
import type { AccountDetail } from '../../types';
import { linkSentText, signInKind } from './overviewText';
import { Value } from './Value';

export interface SignInSectionProps {
  account: AccountDetail;
  grants: AccountGrants;
  onAction: OpenAction;
  now: number;
}

/** The sign-in rows of the Overview. An anonymized account has none to show. */
export function SignInSection({ account, grants, onAction, now }: SignInSectionProps) {
  if (account.status === 'anonymized') return null;
  const kind = signInKind(account);
  const make = actionOffer('make-account', account, grants);
  return (
    <>
      <SectionHeading as="h3">Sign-in</SectionHeading>
      <FormRow label="Login">
        {kind === 'login' && <Value>Login account</Value>}
        {kind === 'invited' && (
          <Value note={linkSentText(account.security?.linkSentAt, now)}>
            Invitation pending: no password yet
          </Value>
        )}
        {kind === 'guest' && (
          <Value
            action={
              make.show ? (
                <span title={make.title} className="inline-flex">
                  <Button
                    size="sm"
                    disabled={make.disabled}
                    onClick={() => onAction('make-account', [account])}
                  >
                    Make an account…
                  </Button>
                </span>
              ) : undefined
            }
          >
            Guest: no login. A guest follows their orders from the link in their email.
          </Value>
        )}
      </FormRow>
    </>
  );
}

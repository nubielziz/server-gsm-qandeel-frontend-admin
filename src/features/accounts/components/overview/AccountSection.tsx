// AccountSection: the "Account" rows of the Overview: number, name, email, rank (with the one way to change it), API username, country,
// currency, when the account began and who made it, and the last sign-in. Read-only; the rank change is a dialog of its own.
import { Button, FormRow, SectionHeading } from '@/components/ui';
import { actionOffer } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import { accountLabel, hasAccountName } from '../shared/accountLabel';
import { countryName } from '../shared/countries';
import type { OpenAction } from '../types';
import type { AccountDetail } from '../../types';
import { createdByText, dayText, joinedText, lastSignInText, rankNote, verifiedText } from './overviewText';
import { Value } from './Value';

export interface AccountSectionProps {
  account: AccountDetail;
  grants: AccountGrants;
  onAction: OpenAction;
  now: number;
}

// The country as the code and its name ("GB · United Kingdom"), or the code alone when the list does not know it.
function countryText(code: string): string {
  if (code.trim() === '') return '–';
  const name = countryName(code);
  return name === code ? code : `${code} · ${name}`;
}

/** The rows about who the account is. */
export function AccountSection({ account, grants, onAction, now }: AccountSectionProps) {
  const anonymized = account.status === 'anonymized';
  const merchant = account.rank.kind === 'merchant';
  const offer = actionOffer('rank', account, grants);
  // The hint under the rank: a guest keeps the retail rank; everyone but the Owner sees the fact read-only.
  const rankHint = anonymized
    ? undefined
    : !account.hasAccount
      ? 'A guest keeps the retail rank. Make an account first.'
      : offer.show
        ? undefined
        : offer.title;
  return (
    <>
      <SectionHeading as="h3">Account</SectionHeading>
      <FormRow label="Number">
        <Value>#{account.id}</Value>
      </FormRow>
      <FormRow label="Name">
        <Value muted={!anonymized && !hasAccountName(account)}>
          {anonymized ? accountLabel(account) : hasAccountName(account) ? account.name.trim() : 'No name'}
        </Value>
      </FormRow>
      {!anonymized && (
        <FormRow label="Email">
          <Value note={account.hasAccount ? verifiedText(account) : undefined}>{account.email}</Value>
        </FormRow>
      )}
      <FormRow label="Rank" hint={rankHint}>
        <Value
          note={rankNote(account.rank)}
          action={
            offer.show && !anonymized ? (
              <span title={offer.title} className="inline-flex">
                <Button size="sm" disabled={offer.disabled} onClick={() => onAction('rank', [account])}>
                  Change rank…
                </Button>
              </span>
            ) : undefined
          }
        >
          {account.rank.name}
        </Value>
      </FormRow>
      {merchant && (
        <FormRow label="Username">
          <Value muted={!account.username} className={account.username ? 'mono' : undefined}>
            {account.username ?? 'None yet'}
          </Value>
        </FormRow>
      )}
      {!anonymized && (
        <FormRow label="Country">
          <Value>{countryText(account.country)}</Value>
        </FormRow>
      )}
      {!merchant && !anonymized && account.currencyCode && (
        <FormRow label="Currency">
          <Value className="mono">{account.currencyCode}</Value>
        </FormRow>
      )}
      <FormRow label="Account since">
        <Value note={joinedText(account.createdAt, now)}>{dayText(account.createdAt) || '–'}</Value>
      </FormRow>
      <FormRow label="Created by">
        <Value note={account.createdBy?.name}>{createdByText(account)}</Value>
      </FormRow>
      {account.hasAccount && (
        <FormRow label="Last sign-in">
          <Value>{lastSignInText(account.lastLoginAt, now)}</Value>
        </FormRow>
      )}
    </>
  );
}

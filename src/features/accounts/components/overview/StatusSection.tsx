// StatusSection: the "Status" rows of the Overview: the status as a square and a word, what is known about why (the reason of a
// suspension, a block, an erasure) and the one button that fits ("Suspend…" or "Reactivate…"). A word the console does not know shows as it
// is and never as a banner: the retired "pending" of the old model is only a word here.
import { Link } from 'react-router';
import { Button, FormRow, SectionHeading } from '@/components/ui';
import { accountPath } from '../../lib/paths';
import { actionOffer } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import { AccountStatus } from '../shared/AccountStatus';
import type { OpenAction } from '../types';
import type { AccountDetail } from '../../types';
import { anonymizedLine, suspensionLine } from './overviewText';
import { Value } from './Value';

export interface StatusSectionProps {
  account: AccountDetail;
  grants: AccountGrants;
  onAction: OpenAction;
  now: number;
}

/** The status of the account, why, and the button that changes it. */
export function StatusSection({ account, grants, onAction, now }: StatusSectionProps) {
  const suspend = actionOffer('suspend', account, grants);
  const reactivate = actionOffer('reactivate', account, grants);
  const offer = suspend.show
    ? { action: 'suspend' as const, label: 'Suspend…', ...suspend }
    : reactivate.show
      ? { action: 'reactivate' as const, label: 'Reactivate…', ...reactivate }
      : undefined;
  const reason = suspensionLine(account.suspension, now);
  const note =
    account.status === 'suspended' ? (
      reason || undefined
    ) : account.status === 'blocked' ? (
      <>
        Blocked for fraud:{' '}
        <Link className="link" to={accountPath(account.id, 'privacy')}>
          see Privacy and risk
        </Link>
      </>
    ) : undefined;
  return (
    <>
      <SectionHeading as="h3">Status</SectionHeading>
      <FormRow
        label="Status"
        hint={account.status === 'anonymized' ? anonymizedLine(account.anonymizedAt) : undefined}
      >
        <Value
          note={note}
          action={
            offer ? (
              <span title={offer.title} className="inline-flex">
                <Button size="sm" disabled={offer.disabled} onClick={() => onAction(offer.action, [account])}>
                  {offer.label}
                </Button>
              </span>
            ) : undefined
          }
        >
          <AccountStatus account={account} />
        </Value>
      </FormRow>
    </>
  );
}

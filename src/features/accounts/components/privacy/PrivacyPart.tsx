// PrivacyPart: the "Privacy and risk" part of one account's record: the marketing choice, the consent evidence of the latest shop order, the
// account's data requests (for staff who may handle them), the risk score and signals, and the buttons that export, anonymize or block.
// It reads `GET /admin/clients/:id/privacy`. Nothing here is saved by a button of its own: every change goes through a dialog of the host.
import { useState } from 'react';
import { FormRow, ReadValue, SectionHeading } from '@/components/ui';
import { BlockIpDialog } from '@/features/access';
import { useNow } from '@/lib/format';
import { useAccountPrivacy } from '../../hooks/useAccountPrivacy';
import { accountLabel } from '../shared/accountLabel';
import type { AccountPartProps } from '../types';
import { AccountRequests } from './AccountRequests';
import { ConsentRecords } from './ConsentRecords';
import { PrivacyActions } from './PrivacyActions';
import { ReadGate } from './ReadGate';
import { RiskRows } from './RiskRows';
import { SeenFrom } from './SeenFrom';

/**
 * The part. Its row in the registry needs `clients:read`; the data requests need `customers:privacy` and are left out without it, the
 * export and the anonymization are offered with it, and blocking needs `clients:block` (each button says so when it is off). A guest has no
 * sign-in, so the address of its latest consent record stands in as "Seen from" with a way to block it. Anonymized accounts keep the part.
 *
 * @param props.account the account (the part reads its privacy facts itself).
 * @param props.grants what the staff member may do.
 * @param props.onAction opens a dialog of the host.
 * @see GET /admin/clients/:id/privacy
 */
export function PrivacyPart({ account, grants, onAction }: AccountPartProps) {
  const privacy = useAccountPrivacy(account.id);
  const now = useNow();
  const [blockingIp, setBlockingIp] = useState(false);
  // The address of a guest is personal data: an anonymized record has none to show.
  const showSeenFrom = !account.hasAccount && account.status !== 'anonymized';

  return (
    <div>
      <SectionHeading as="h3">Privacy</SectionHeading>
      <ReadGate query={privacy} what="privacy details">
        {(data) => (
          <>
            <FormRow label="Marketing emails">
              <ReadValue>{data.marketingOptIn ? 'Opted in' : 'Not opted in'}</ReadValue>
            </FormRow>
            <FormRow label="Consent records">
              <ConsentRecords latest={data.latestConsents} />
            </FormRow>
            {showSeenFrom && (
              <FormRow label="Seen from">
                <SeenFrom
                  ip={data.latestConsents?.records[0]?.ip ?? null}
                  lock={grants.needs('access:create')}
                  onBlock={() => setBlockingIp(true)}
                />
              </FormRow>
            )}
          </>
        )}
      </ReadGate>

      {grants.can('customers:privacy') && (
        <>
          <SectionHeading as="h3">Data requests</SectionHeading>
          <FormRow label="Requests">
            <AccountRequests accountId={account.id} now={now} />
          </FormRow>
        </>
      )}

      <SectionHeading as="h3">Risk</SectionHeading>
      <ReadGate query={privacy} what="risk details" quiet>
        {(data) => <RiskRows risk={data.risk} />}
      </ReadGate>

      <SectionHeading as="h3">Actions</SectionHeading>
      <PrivacyActions account={account} grants={grants} onAction={onAction} />

      {blockingIp && (
        <BlockIpDialog
          ip={privacy.data?.latestConsents?.records[0]?.ip ?? ''}
          scope="store"
          who={accountLabel(account)}
          onClose={() => setBlockingIp(false)}
        />
      )}
    </div>
  );
}

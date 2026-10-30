// PrivacyPanel: the "Data and privacy" column of the Consents tab: marketing opt-in, how long IMEIs are kept, this customer's data
// requests, and the two privacy actions, each behind a review step (export their data, anonymise). Ports the right column of the
// Consents tab in pageCustomer (48-p-customers.js). Rows whose data needs a permission the staff member lacks are left out.
import { Button, Icon, KeyValue } from '@/components/ui';
import { useSettings } from '@/features/settings';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerDetail } from '../types';
import type { CustomerDialogKind } from './customerDialogState';
import { CustomerRequests } from './CustomerRequests';

export interface PrivacyPanelProps {
  customer: CustomerDetail;
  grants: CustomerGrants;
  now: number;
  onAction: (kind: CustomerDialogKind) => void;
}

export function PrivacyPanel({ customer, grants, now, onAction }: PrivacyPanelProps) {
  const privacy = grants.needs('customers:privacy');
  const canReadSettings = grants.can('settings:read');
  // The retention period is a setting; without settings:read the row is left out rather than shown wrong.
  const settings = useSettings({ enabled: canReadSettings });
  const retention = settings.data?.imeiRetentionDays;

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-ink3">Data and privacy</h3>
      <KeyValue
        rows={[
          ['Marketing emails', customer.marketingOptIn ? 'Opted in' : 'Not opted in'],
          canReadSettings &&
            typeof retention === 'number' && [
              'IMEI storage',
              `Kept for ${retention} days after the order, then removed`,
            ],
          grants.can('customers:privacy') && [
            'Requests',
            <CustomerRequests customerId={customer.id} now={now} />,
          ],
        ]}
      />
      {customer.status === 'anonymized' ? (
        <p className="mt-3 rounded-md bg-sunken p-2.5 text-sm text-ink2">
          Name, email and IMEIs have been removed. Order and payment records stay for accounting.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={privacy.disabled} title={privacy.title} onClick={() => onAction('export')}>
            <Icon name="download" className="ic-sm" />
            Export their data
          </Button>
          <Button
            variant="danger"
            disabled={privacy.disabled}
            title={privacy.title}
            onClick={() => onAction('anonymize')}
          >
            <Icon name="ban" className="ic-sm" />
            Anonymise…
          </Button>
        </div>
      )}
    </div>
  );
}

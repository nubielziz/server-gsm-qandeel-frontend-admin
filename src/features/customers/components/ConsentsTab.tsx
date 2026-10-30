// ConsentsTab: "Consents and data": the consent evidence of the latest order on the left, the privacy facts and actions on the
// right. Ports the Consents tab of pageCustomer in 48-p-customers.js.
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerDetail } from '../types';
import { ConsentList } from './ConsentList';
import type { CustomerDialogKind } from './customerDialogState';
import { PrivacyPanel } from './PrivacyPanel';

export interface ConsentsTabProps {
  customer: CustomerDetail;
  grants: CustomerGrants;
  now: number;
  onAction: (kind: CustomerDialogKind) => void;
}

export function ConsentsTab({ customer, grants, now, onAction }: ConsentsTabProps) {
  return (
    <div className="grid gap-4 p-3.5 lg:grid-cols-2">
      <ConsentList latest={customer.latestConsents} />
      <PrivacyPanel customer={customer} grants={grants} now={now} onAction={onAction} />
    </div>
  );
}

// AccountTab: the Account tab, two columns: sign-in and contact facts on the left, the buttons that manage the account on the
// right. Ports `accountTab` of 48-p-customers.js. A removed (anonymised) customer has no account left to manage.
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerDetail } from '../types';
import { AccountActions } from './AccountActions';
import { AccountDetails } from './AccountDetails';
import type { CustomerDialogKind } from './customerDialogState';

export interface AccountTabProps {
  customer: CustomerDetail;
  grants: CustomerGrants;
  now: number;
  onAction: (kind: CustomerDialogKind) => void;
}

export function AccountTab({ customer, grants, now, onAction }: AccountTabProps) {
  if (customer.status === 'anonymized') {
    return (
      <p className="p-3.5 text-sm text-ink2">
        This customer was anonymised. There is no account left to manage.
      </p>
    );
  }
  return (
    <div className="grid gap-4 p-3.5 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-medium text-ink3">Sign-in and contact</h3>
        <AccountDetails
          customer={customer}
          now={now}
          blockLock={grants.needs('access:create')}
          onBlockIp={() => onAction('block-ip')}
        />
      </div>
      <div>
        <h3 className="mb-2 text-xs font-medium text-ink3">Manage the account</h3>
        <AccountActions customer={customer} grants={grants} onAction={onAction} />
      </div>
    </div>
  );
}

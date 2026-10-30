// SuspendedBanner: the warning above the figures of a suspended customer, with a Reactivate button. Ports the `hold` banner of
// pageCustomer in 48-p-customers.js.
import { Button, Icon } from '@/components/ui';
import { ago } from '@/lib/format';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerDetail } from '../types';

export interface SuspendedBannerProps {
  customer: CustomerDetail;
  grants: CustomerGrants;
  now: number;
  onReactivate: () => void;
}

export function SuspendedBanner({ customer, grants, now, onReactivate }: SuspendedBannerProps) {
  const lock = grants.needs('customers:suspend');
  // The reason may already end with a full stop; the sentence below adds exactly one.
  const reason = customer.suspendedReason?.trim().replace(/[.!?\s]+$/, '');
  return (
    <div
      className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-line bg-warn-bg px-3.5 py-3 text-sm text-warn-fg"
      role="status"
    >
      <Icon name="pause" className="ic-sm mt-0.5 flex-none" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Account suspended {ago(customer.suspendedAt, now)}</p>
        <p>
          {reason ? `${reason}. ` : ''}They can’t sign in or place new orders. Orders already in progress will
          finish.
        </p>
      </div>
      <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={onReactivate}>
        Reactivate
      </Button>
    </div>
  );
}

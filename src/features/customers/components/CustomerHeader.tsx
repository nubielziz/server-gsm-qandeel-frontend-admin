// CustomerHeader: the customer's name with the status and risk badges, the sub-line (email, country, since when) and the
// actions: Edit details, Suspend… / Reactivate, Block… / Unblock. Ports the `head` of pageCustomer in 48-p-customers.js,
// without its Email button (MISMATCHES M84). A removed (anonymised) customer has no actions.
import { Button, Icon, PageHeader } from '@/components/ui';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import { countryName } from '../lib/countries';
import { customerSince } from '../lib/text';
import type { CustomerDetail } from '../types';
import type { CustomerDialogKind } from './customerDialogState';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import { RiskBadge } from './RiskBadge';

export interface CustomerHeaderProps {
  customer: CustomerDetail;
  grants: CustomerGrants;
  onAction: (kind: CustomerDialogKind) => void;
}

export function CustomerHeader({ customer, grants, onAction }: CustomerHeaderProps) {
  const gone = customer.status === 'anonymized';
  const update = grants.needs('customers:update');
  const suspend = grants.needs('customers:suspend');
  const block = grants.needs('customers:block');

  return (
    <PageHeader
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {customer.name} <CustomerStatusBadge status={customer.status} />
          {customer.riskLevel !== 'low' && <RiskBadge level={customer.riskLevel} suffix=" risk" />}
        </span>
      }
      sub={`${gone ? 'Personal data removed' : customer.email} · ${countryName(customer.country)} · customer since ${customerSince(customer.createdAt)}`}
      actions={
        gone ? undefined : (
          <>
            <Button disabled={update.disabled} title={update.title} onClick={() => onAction('edit')}>
              <Icon name="edit" className="ic-sm" />
              Edit details
            </Button>
            {customer.status === 'suspended' ? (
              <Button
                disabled={suspend.disabled}
                title={suspend.title}
                onClick={() => onAction('reactivate')}
              >
                <Icon name="checkCircle" className="ic-sm" />
                Reactivate
              </Button>
            ) : customer.status === 'active' ? (
              <Button disabled={suspend.disabled} title={suspend.title} onClick={() => onAction('suspend')}>
                <Icon name="pause" className="ic-sm" />
                Suspend…
              </Button>
            ) : null}
            {customer.status === 'blocked' ? (
              <Button disabled={block.disabled} title={block.title} onClick={() => onAction('unblock')}>
                <Icon name="checkCircle" className="ic-sm" />
                Unblock
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={block.disabled}
                title={block.title}
                onClick={() => onAction('block')}
              >
                <Icon name="ban" className="ic-sm" />
                Block…
              </Button>
            )}
          </>
        )
      }
    />
  );
}

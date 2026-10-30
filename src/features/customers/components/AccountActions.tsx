// AccountActions: the "Manage the account" column of the Account tab: the buttons for the customer's state, and the short
// explanation of Suspend and Block. Ports the `right` column and `btns`/`stat` of accountTab in 48-p-customers.js.
import { Button, Icon } from '@/components/ui';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerDetail } from '../types';
import type { CustomerDialogKind } from './customerDialogState';

export interface AccountActionsProps {
  customer: CustomerDetail;
  grants: CustomerGrants;
  onAction: (kind: CustomerDialogKind) => void;
}

/**
 * A guest can be edited and given an account; an account can be edited, get a new password and be signed out (off when there
 * are no sessions). An active account can be suspended, a suspended one reactivated.
 */
export function AccountActions({ customer, grants, onAction }: AccountActionsProps) {
  const update = grants.needs('customers:update');
  const password = grants.needs('customers:password');
  const suspend = grants.needs('customers:suspend');
  const sessions = customer.account?.activeSessions ?? 0;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button disabled={update.disabled} title={update.title} onClick={() => onAction('edit')}>
          <Icon name="edit" className="ic-sm" />
          Edit details
        </Button>
        {customer.account ? (
          <>
            <Button disabled={password.disabled} title={password.title} onClick={() => onAction('password')}>
              <Icon name="lock" className="ic-sm" />
              Password…
            </Button>
            <Button
              disabled={password.disabled || sessions === 0}
              title={password.title}
              onClick={() => onAction('signout')}
            >
              <Icon name="upload" className="ic-sm" />
              Sign out everywhere
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            disabled={update.disabled}
            title={update.title}
            onClick={() => onAction('account')}
          >
            <Icon name="plus" className="ic-sm" />
            Create account…
          </Button>
        )}
        {customer.status === 'suspended' ? (
          <Button disabled={suspend.disabled} title={suspend.title} onClick={() => onAction('reactivate')}>
            <Icon name="checkCircle" className="ic-sm" />
            Reactivate
          </Button>
        ) : customer.status === 'active' ? (
          <Button disabled={suspend.disabled} title={suspend.title} onClick={() => onAction('suspend')}>
            <Icon name="pause" className="ic-sm" />
            Suspend…
          </Button>
        ) : null}
      </div>
      <dl className="mt-4 space-y-2 text-sm text-ink2">
        <div>
          <dt className="inline font-medium text-ink">Suspend</dt>{' '}
          <dd className="inline">
            pauses the account. They can’t sign in or order, nothing is added to the blocklist, and you can
            reverse it in one click. Use it for a lost phone or a quick check.
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-ink">Block</dt>{' '}
          <dd className="inline">
            is for fraud. It adds their email to the blocklist and marks them high risk.
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink3">
        Passwords are stored as hashes. Nobody on your team can read a customer’s password, only replace it.
      </p>
    </>
  );
}

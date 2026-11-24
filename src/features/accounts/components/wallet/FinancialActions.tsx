// FinancialActions: the buttons under the rows of the Financial part: Adjust wallet…, Put on hold… or Lift hold…, Credit limit… and, for a merchant
// wallet, Download official statement. The first four open the dialogs of the dialog host; what each is offered, and why one is off, is the
// one table of `actionRules`. The download needs `reports:read` and `wallet:read`.
import type { ReactNode } from 'react';
import { Button, FormRow, Icon } from '@/components/ui';
import type { AccountRow, AccountWallet } from '../../types';
import { actionOffer } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { AccountAction, OpenAction } from '../types';

export interface FinancialActionsProps {
  account: AccountRow;
  wallet: AccountWallet;
  grants: AccountGrants;
  onAction: OpenAction;
  onDownload: () => void;
  downloading: boolean;
}

/**
 * The account as the offers read it: the hold comes from the wallet read the part shows, so the button and the "Hold" row never disagree for
 * the moment between a write and the record being read again.
 */
function withHold(account: AccountRow, wallet: AccountWallet): AccountRow {
  return account.wallet
    ? { ...account, wallet: { ...account.wallet, frozen: wallet.frozen !== null } }
    : account;
}

/**
 * The buttons. A button an offer hides is not drawn; one it disables shows the reason as its title.
 *
 * @param props see `FinancialActionsProps`.
 */
export function FinancialActions({
  account,
  wallet,
  grants,
  onAction,
  onDownload,
  downloading,
}: FinancialActionsProps) {
  const seen = withHold(account, wallet);
  const open = (action: AccountAction, label: string): ReactNode => {
    const offer = actionOffer(action, seen, grants);
    if (!offer.show) return null;
    return (
      <Button disabled={offer.disabled} title={offer.title} onClick={() => onAction(action, [account])}>
        {label}
      </Button>
    );
  };
  const statementLock = grants.needsAll('reports:read', 'wallet:read');

  return (
    <FormRow label={null}>
      <div className="flex flex-wrap gap-2">
        {open('adjust', 'Adjust wallet…')}
        {open('freeze', 'Put on hold…')}
        {open('unfreeze', 'Lift hold…')}
        {open('credit-limit', 'Credit limit…')}
        {wallet.kind === 'merchant' && (
          <Button
            disabled={statementLock.disabled}
            title={statementLock.title}
            loading={downloading}
            onClick={onDownload}
          >
            <Icon name="download" className="ic-sm" />
            Download official statement
          </Button>
        )}
      </div>
    </FormRow>
  );
}

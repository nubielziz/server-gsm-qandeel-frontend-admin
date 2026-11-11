// WalletTab: the "Wallet" tab of a customer's page (feature 21): the figures and hold, the statement, and the dialogs that adjust,
// freeze or unfreeze the balance. The page only offers the tab with `wallet:read` (an address that names it without that shows the
// Orders tab); each button needs `wallet:adjust`. The server owns every figure and every rule.
import { useState } from 'react';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import { useCustomerWallet } from '../hooks/useCustomerWallet';
import type { CustomerDetail } from '../types';
import { AdjustWalletDialog } from './AdjustWalletDialog';
import { FreezeWalletDialog } from './FreezeWalletDialog';
import { UnfreezeWalletDialog } from './UnfreezeWalletDialog';
import { WalletStatementTable } from './WalletStatementTable';
import { WalletSummary } from './WalletSummary';

type WalletDialog = 'adjust' | 'freeze' | 'unfreeze';

/** Puts the summary above the statement and owns which wallet dialog is open. */
export function WalletTab({ customer, grants }: { customer: CustomerDetail; grants: CustomerGrants }) {
  const wallet = useCustomerWallet(customer.id, grants.can('wallet:read'));
  const [dialog, setDialog] = useState<WalletDialog | null>(null);
  const close = () => setDialog(null);

  return (
    <div>
      <WalletSummary
        wallet={wallet.data}
        loading={wallet.isLoading}
        failed={wallet.isError}
        onRetry={() => void wallet.refetch()}
        grants={grants}
        onAdjust={() => setDialog('adjust')}
        onFreeze={() => setDialog('freeze')}
        onUnfreeze={() => setDialog('unfreeze')}
      />
      <WalletStatementTable customer={customer} grants={grants} />
      {dialog === 'adjust' && wallet.data && (
        <AdjustWalletDialog customer={customer} wallet={wallet.data} onClose={close} />
      )}
      {dialog === 'freeze' && <FreezeWalletDialog customer={customer} onClose={close} />}
      {dialog === 'unfreeze' && <UnfreezeWalletDialog customer={customer} onClose={close} />}
    </div>
  );
}

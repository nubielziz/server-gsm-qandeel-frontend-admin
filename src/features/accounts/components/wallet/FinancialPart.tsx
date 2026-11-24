// FinancialPart: the "Financial" part of the record: the wallet of the account, read-only rows with the buttons that open the wallet dialogs
// and the official statement download. One address serves both wallet kinds (a merchant wallet and a store balance); the server works out every figure.
import { Button, FormRow, SectionHeading, Skeleton } from '@/components/ui';
import { useAccountWallet } from '../../hooks/useAccountWallet';
import type { AccountPartProps } from '../types';
import { FinancialActions } from './FinancialActions';
import { useStatementFile } from './useWalletWrites';
import { WalletRows } from './WalletRows';

/** Row-shaped skeletons while the wallet is read. */
function WalletLoading() {
  return (
    <div role="status" aria-label="Loading the wallet">
      {Array.from({ length: 7 }, (_, line) => (
        <FormRow key={line} label={<Skeleton width={90} height={12} />}>
          <Skeleton width={120 + ((line * 23) % 80)} height={14} />
        </FormRow>
      ))}
    </div>
  );
}

/**
 * The wallet rows and the buttons. Loading shows row skeletons; a failed read says so inside the part, with Retry, and the rest of the record stays.
 * Opening a dialog is `onAction(action, [account])`: the dialog host mounts it with a key of its own for each opening.
 *
 * @param props.account the account; its record gives the buttons their rules.
 * @param props.grants what the staff member may do.
 * @param props.onAction asks the dialog host to open a dialog.
 * @see GET /admin/clients/:id/wallet
 * @see GET /admin/reports/client-statement/:clientId
 */
export function FinancialPart({ account, grants, onAction }: AccountPartProps) {
  const wallet = useAccountWallet(account.id, grants.can('wallet:read'));
  const download = useStatementFile();
  const data = wallet.data;

  return (
    <div className="view-frame">
      <div>
        <SectionHeading as="h3">Wallet</SectionHeading>
        {wallet.isLoading && <WalletLoading />}
        {wallet.isError && !data && (
          <p className="py-2 text-sm text-crit-fg" role="alert">
            Could not load the wallet.{' '}
            <Button variant="ghost" size="sm" onClick={() => void wallet.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {data && (
          <>
            <WalletRows wallet={data} />
            <FinancialActions
              account={account}
              wallet={data}
              grants={grants}
              onAction={onAction}
              onDownload={() => download.mutate(account)}
              downloading={download.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}

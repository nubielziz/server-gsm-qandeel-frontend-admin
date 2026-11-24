// ReactivateDialog: "Reactivate <name>?" for one account, or "Reactivate <n> accounts?" for the ticked ones of the list. They can sign in and
// order again. It merges the merchant's and the customer's "Reactivate" buttons into one question. Many accounts run one request each,
// in order, with a progress line.
import { BulkSummaryDialog, ConfirmDialog } from '@/components/ui';
import { updateAccount } from '../../api';
import { useReactivateAccount } from '../../hooks/useAccountMutations';
import { dialogTitle } from '../shared/dialogTitles';
import type { ManyAccountsDialogProps } from '../types';
import { useBulkStatus } from './useBulkStatus';

const UNIT = { one: 'account', many: 'accounts' };

/**
 * Lets one suspended account, or each of many in turn, sign in and order again.
 *
 * @param props the accounts to reactivate (the host gives only the suspended ones) and the close handler
 * Side effects: `PATCH /admin/clients/:id { status: 'active' }` per account; the lists, records and counts go stale; a toast, or a summary
 * of the accounts the server refused. A refusal for one account stays in the dialog, which stays open.
 */
export function ReactivateDialog({ accounts, onClose }: ManyAccountsDialogProps) {
  const [first] = accounts;
  const many = accounts.length > 1;
  const reactivate = useReactivateAccount();
  const bulk = useBulkStatus();

  async function confirm() {
    if (!many) {
      if (first) await reactivate.mutateAsync(first);
      return;
    }
    const everyone = await bulk.runOver('Reactivating', 'reactivated', accounts, (account) =>
      updateAccount(account.id, { status: 'active' }),
    );
    // Some were refused: the summary takes the dialog's place, so this one must not close on its own.
    return everyone ? undefined : false;
  }

  if (bulk.summary) return <BulkSummaryDialog summary={bulk.summary} unit={UNIT} onClose={onClose} />;
  return (
    <ConfirmDialog
      open
      title={dialogTitle('reactivate', accounts)}
      body={
        <>
          <p>They can sign in and order again.</p>
          {bulk.progress && (
            <p className="mt-3 text-ink2" role="status">
              {bulk.progress.verb} {bulk.progress.done} of {bulk.progress.total}…
            </p>
          )}
        </>
      }
      confirm="Reactivate"
      onClose={onClose}
      onConfirm={confirm}
    />
  );
}

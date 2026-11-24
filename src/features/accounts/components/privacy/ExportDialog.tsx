// ExportDialog: "Export the data of <name>?": the review step before a file of everything stored about the account is downloaded. Nothing is
// asked of the server until the question is confirmed. The server's refusal stays in the dialog, which stays open (no error toast).
import { ConfirmDialog } from '@/components/ui';
import { useExportAccountData } from '../../hooks/useAccountPrivacy';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';

/**
 * Downloads the account's data as a JSON file after a review step. The file is named by the server, else `account-<id>.json`. The
 * server may mark an open export request of the account done, so the data requests refresh. Needs `customers:privacy`.
 *
 * @param props.account the account to export.
 * @param props.onClose asks the host to close the dialog (done, or cancelled).
 * @see GET /admin/clients/:id/export
 */
export function ExportDialog({ account, onClose }: AccountDialogProps) {
  const exporter = useExportAccountData();
  return (
    <ConfirmDialog
      open
      title={dialogTitle('export', [account])}
      body={
        <p>
          A JSON file with everything stored about this account (never a key or a password). For a retail
          account with a proven email it also holds the orders placed as a guest with that email. An open
          export request of this account is marked done.
        </p>
      }
      confirm="Export"
      onClose={onClose}
      onConfirm={() => exporter.mutateAsync(account).then(() => undefined)}
    />
  );
}

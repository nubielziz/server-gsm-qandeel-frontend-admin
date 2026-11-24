// Reset2faDialog: "Reset two-step sign-in of <name>?" (action `reset-2fa`): a review step before two-step sign-in is turned off for an account
// that lost its device. Every session ends and the person is mailed a notice. The server's refusal stays in the dialog.
import { ConfirmDialog } from '@/components/ui';
import { useResetAccountTwoFactor } from '../../hooks/useSecurityMutations';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';

/**
 * The reset dialog of one account. It is mounted only while open.
 *
 * Why: staff turn two-step sign-in off for someone locked out of it. Offered with `clients:security` while two-step sign-in is on
 * (`actionOffer('reset-2fa', …)`); the server answers `TWOFA_NOT_ENABLED` (409) when it is off already, and that shows in the dialog.
 * Side effects: `POST /admin/clients/:id/reset-2fa`; the account's record is read again; a toast.
 */
export function Reset2faDialog({ account, onClose }: AccountDialogProps) {
  const reset = useResetAccountTwoFactor();
  return (
    <ConfirmDialog
      open
      title={dialogTitle('reset-2fa', [account])}
      body={
        <>
          <p>
            Two-step sign-in is turned off and every session of theirs ends. They are emailed a security
            notice.
          </p>
          <p className="mt-2">They set it up again at the next sign-in.</p>
        </>
      }
      confirm="Reset two-step sign-in"
      kind="danger"
      onClose={onClose}
      onConfirm={() => reset.mutateAsync(account).then(() => undefined)}
    />
  );
}

// WalletHoldDialogs: "Put the wallet of <name> on hold?" and "Lift the hold on the wallet of <name>?". Both ask for a reason for the audit log
// and send it with this opening's key. A hold stops spending from the wallet; lifting it lets the wallet be spent again.
import { useFreezeWallet, useUnfreezeWallet } from '../../hooks/useWalletMutations';
import type { AccountRow, WalletKind } from '../../types';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import { WalletReasonDialog } from './WalletReasonDialog';
import { holdMailText, liftRefusalText } from './walletText';

// The kind of the live wallet follows the rank: a merchant rank has a merchant wallet, every other rank a store balance.
const walletKindOf = (account: AccountRow): WalletKind =>
  account.wallet?.kind ?? (account.rank.kind === 'merchant' ? 'merchant' : 'store');

/**
 * Puts the live wallet on hold with a reason. Credits, refunds and staff adjustments still work. A customer whose store balance is held is
 * emailed; a merchant is not, and the dialog says which applies.
 *
 * @param props.account the account the dialog is about.
 * @param props.onClose asked for when the dialog is done or cancelled.
 * @throws nothing: a refusal stays in the dialog.
 * @see POST /admin/clients/:id/wallet/freeze
 */
export function FreezeWalletDialog({ account, onClose }: AccountDialogProps) {
  const freeze = useFreezeWallet();
  return (
    <WalletReasonDialog
      title={dialogTitle('freeze', [account])}
      text={`Spending from the wallet stops until the hold is lifted. Credits, refunds and staff adjustments still work. ${holdMailText(walletKindOf(account))}`}
      confirm="Put on hold"
      kind="danger"
      onSend={(reason, key) => freeze.mutateAsync({ account, body: { reason }, key })}
      onClose={onClose}
    />
  );
}

/**
 * Lifts the hold on the live wallet with a reason. The server refuses while a store balance is below zero or while a dispute of one of the
 * account's top-ups is open (either kind), and the dialog shows its words.
 *
 * @param props.account the account the dialog is about.
 * @param props.onClose asked for when the dialog is done or cancelled.
 * @throws nothing: a refusal stays in the dialog.
 * @see POST /admin/clients/:id/wallet/unfreeze
 */
export function UnfreezeWalletDialog({ account, onClose }: AccountDialogProps) {
  const unfreeze = useUnfreezeWallet();
  return (
    <WalletReasonDialog
      title={dialogTitle('unfreeze', [account])}
      text="The wallet can be spent again."
      confirm="Lift hold"
      note={liftRefusalText(walletKindOf(account))}
      onSend={(reason, key) => unfreeze.mutateAsync({ account, body: { reason }, key })}
      onClose={onClose}
    />
  );
}

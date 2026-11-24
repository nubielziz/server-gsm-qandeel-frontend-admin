// AccountDialogs: the dialog host. Parts and the list ask for a dialog by calling `onAction(action, accounts)`; the host
// mounts the one dialog of that action and nothing else, so a dialog starts empty each time it opens, and unmounts it when it closes.
// The dialogs live in their areas (wallet, rank, status, security, privacy); each opens with its fixed title (shared/dialogTitles).
import type { ComponentType } from 'react';
import { AdjustWalletDialog, CreditLimitDialog, FreezeWalletDialog, UnfreezeWalletDialog } from '../wallet';
import { AnonymizeDialog, BlockDialog, ExportDialog, UnblockDialog } from '../privacy';
import { MakeAccountDialog, PasswordDialog, Reset2faDialog, SignOutDialog } from '../security';
import { ReactivateDialog, SuspendDialog } from '../status';
import { RankChangeDialog } from '../rank';
import type { AccountAction, AccountDialogProps, ManyAccountsDialogProps } from '../types';
import type { DialogRequest } from './useAccountDialogs';

type ManyAction = 'suspend' | 'reactivate' | 'signout';

// The dialogs that work on one or many accounts.
const MANY: Record<ManyAction, ComponentType<ManyAccountsDialogProps>> = {
  suspend: SuspendDialog,
  reactivate: ReactivateDialog,
  signout: SignOutDialog,
};

// The dialogs about one account.
const ONE: Record<Exclude<AccountAction, ManyAction>, ComponentType<AccountDialogProps>> = {
  adjust: AdjustWalletDialog,
  freeze: FreezeWalletDialog,
  unfreeze: UnfreezeWalletDialog,
  'credit-limit': CreditLimitDialog,
  rank: RankChangeDialog,
  block: BlockDialog,
  unblock: UnblockDialog,
  password: PasswordDialog,
  'reset-2fa': Reset2faDialog,
  'make-account': MakeAccountDialog,
  export: ExportDialog,
  anonymize: AnonymizeDialog,
};

const isMany = (action: AccountAction): action is ManyAction => action in MANY;

export interface AccountDialogsProps {
  request: DialogRequest | null;
  /** The dialog asks to close (done, or cancelled). */
  onClose: () => void;
}

/** The open dialog, or nothing. */
export function AccountDialogs({ request, onClose }: AccountDialogsProps) {
  const first = request?.accounts[0];
  if (!request || !first) return null;
  const { action, accounts, opening } = request;
  if (isMany(action)) {
    const Dialog = MANY[action];
    return <Dialog key={opening} accounts={accounts} onClose={onClose} />;
  }
  const Dialog = ONE[action];
  return <Dialog key={opening} account={first} onClose={onClose} />;
}

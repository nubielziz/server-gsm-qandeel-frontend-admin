// MerchantDialogs: shows the dialog the merchant page opened (adjust wallet, credit limit, suspend, edit details). The page
// keeps which one is open; each dialog is mounted only while open, so every opening starts with empty fields.
import type { Client, ClientWallet } from '../types';
import { AdjustWalletDialog } from './AdjustWalletDialog';
import { CreditLimitDialog } from './CreditLimitDialog';
import { EditMerchantDialog } from './EditMerchantDialog';
import { SuspendMerchantDialog } from './SuspendMerchantDialog';

/** The dialogs of the page header and of the Profile tab. */
export type MerchantDialogState =
  { kind: 'adjust' } | { kind: 'credit' } | { kind: 'suspend' } | { kind: 'edit' };

export interface MerchantDialogsProps {
  dialog: MerchantDialogState | null;
  client: Client;
  wallet: ClientWallet | undefined;
  onClose: () => void;
}

/** Renders the header dialog that is open, or nothing. */
export function MerchantDialogs({ dialog, client, wallet, onClose }: MerchantDialogsProps) {
  switch (dialog?.kind) {
    case 'adjust':
      return <AdjustWalletDialog client={client} wallet={wallet} onClose={onClose} />;
    case 'credit':
      return <CreditLimitDialog client={client} wallet={wallet} onClose={onClose} />;
    case 'suspend':
      return <SuspendMerchantDialog client={client} onClose={onClose} />;
    case 'edit':
      return <EditMerchantDialog client={client} onClose={onClose} />;
    default:
      return null;
  }
}

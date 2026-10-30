// MerchantDialogs: shows the dialog the merchant page's header opened (adjust wallet, credit limit, suspend). The page keeps
// which one is open; each dialog is mounted only while open, so every opening starts with empty fields.
import type { Client, ClientWallet } from '../types';
import { AdjustWalletDialog } from './AdjustWalletDialog';
import { CreditLimitDialog } from './CreditLimitDialog';
import { SuspendMerchantDialog } from './SuspendMerchantDialog';

/** The dialogs of the page header. */
export type MerchantDialogState = { kind: 'adjust' } | { kind: 'credit' } | { kind: 'suspend' };

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
    default:
      return null;
  }
}

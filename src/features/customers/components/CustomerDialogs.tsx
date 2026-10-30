// CustomerDialogs: renders the dialog the customer page has open (edit, password, create account, suspend, block, the five
// reviews, "Block IP…" and the one-time password). Each dialog is mounted only while open, so it always starts with empty fields.
import { BlockIpDialog, RevealPasswordDialog } from '@/features/access';
import { lastSeenIp } from '../lib/text';
import { BlockDialog } from './BlockDialog';
import { CreateAccountDialog } from './CreateAccountDialog';
import { CustomerConfirmDialog } from './CustomerConfirmDialog';
import type { CustomerDialogState } from './customerDialogState';
import { EditCustomerDialog } from './EditCustomerDialog';
import { PasswordDialog } from './PasswordDialog';
import { SuspendDialog } from './SuspendDialog';

export interface CustomerDialogsProps {
  dialog: CustomerDialogState | null;
  /** Closes the dialog, or swaps it for another one (the one-time password after an account or password change). */
  onChange: (next: CustomerDialogState | null) => void;
}

/** Picks the dialog for the open state. */
export function CustomerDialogs({ dialog, onChange }: CustomerDialogsProps) {
  if (!dialog) return null;
  const close = () => onChange(null);
  const reveal = (name: string, password: string) => onChange({ kind: 'reveal', name, password });
  switch (dialog.kind) {
    case 'edit':
      return <EditCustomerDialog customer={dialog.customer} onClose={close} />;
    case 'password':
      return <PasswordDialog customer={dialog.customer} onClose={close} onReveal={reveal} />;
    case 'account':
      return <CreateAccountDialog customer={dialog.customer} onClose={close} onReveal={reveal} />;
    case 'suspend':
      return <SuspendDialog customer={dialog.customer} onClose={close} />;
    case 'block':
      return <BlockDialog customer={dialog.customer} onClose={close} />;
    case 'signout':
    case 'reactivate':
    case 'unblock':
    case 'export':
    case 'anonymize':
      return <CustomerConfirmDialog kind={dialog.kind} customer={dialog.customer} onClose={close} />;
    case 'block-ip':
      return (
        <BlockIpDialog
          ip={lastSeenIp(dialog.customer) ?? ''}
          scope="store"
          who={dialog.customer.name}
          onClose={close}
        />
      );
    case 'reveal':
      return <RevealPasswordDialog name={dialog.name} password={dialog.password} onClose={close} />;
  }
}

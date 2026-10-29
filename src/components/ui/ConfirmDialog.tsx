// ConfirmDialog: review step before a money-moving or destructive action. Ports confirmDlg() of 20-ui.js.
import type { ReactNode } from 'react';
import { FormDialog, type FormDialogProps, type FormDialogResult } from './FormDialog';

export interface ConfirmDialogProps extends Omit<FormDialogProps, 'onSubmit' | 'children'> {
  /** State the consequence before the confirm button ("This refunds $24.00 to the wallet"). */
  body: ReactNode;
  /** Runs when the user confirms. Return a promise: the button stays disabled until it settles. */
  onConfirm: () => FormDialogResult | Promise<FormDialogResult>;
}

export function ConfirmDialog({ body, onConfirm, ...rest }: ConfirmDialogProps) {
  return (
    <FormDialog {...rest} onSubmit={() => onConfirm()}>
      <div className="text-sm text-ink2">{body}</div>
    </FormDialog>
  );
}

// PaymentDialogs: the dialog the Payment methods tab has open: add or edit a method, delete one, or confirm turning off the last
// storefront method (the demo's confirmDlg for `st-gw`). Each one shows the server's refusal in its own error slot.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteGateway, useToggleGateway } from '../hooks/useGateways';
import type { PaymentGateway } from '../types';
import { GatewayDialog } from './GatewayDialog';

/** Which dialog is open. */
export type PaymentDialogState =
  { kind: 'create' } | { kind: 'edit' | 'delete' | 'last'; gateway: PaymentGateway };

/** The open dialog, or nothing. */
export function PaymentDialogs({
  dialog,
  onClose,
}: {
  dialog: PaymentDialogState | null;
  onClose: () => void;
}) {
  const toggle = useToggleGateway();
  const remove = useDeleteGateway();
  if (!dialog) return null;
  if (dialog.kind === 'create') return <GatewayDialog onClose={onClose} />;
  if (dialog.kind === 'edit') return <GatewayDialog gateway={dialog.gateway} onClose={onClose} />;
  const { gateway } = dialog;
  if (dialog.kind === 'last') {
    return (
      <ConfirmDialog
        open
        title="Turn off the last storefront payment method?"
        body={
          <p>Customers will not be able to pay. The checkout keeps working but shows no payment option.</p>
        }
        confirm="Turn off"
        kind="danger"
        onClose={onClose}
        onConfirm={() => toggle.mutateAsync({ gateway, on: false }).then(() => undefined)}
      />
    );
  }
  return (
    <ConfirmDialog
      open
      title={`Delete ${gateway.name}?`}
      body={
        <p>
          The payment method is removed for good. One that took payments lately cannot be deleted: turn it off
          instead.
        </p>
      }
      confirm="Delete payment method"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(gateway).then(() => undefined)}
    />
  );
}

// VerificationDialog: the answer to a verification request, accept the result or refund (`POST /admin/orders/:id/verification`).
// The demo has no verification step; the map adds it. Built in the demo's dialog style (MISMATCHES M31).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField } from '@/components/ui';
import { useDecideVerification } from '../hooks/useOrderMutations';
import { orderLabel } from '../lib/status';
import type { Order, VerificationDecision } from '../types';

type Values = { note: string };

export interface VerificationDialogProps {
  order: Order;
  decision: VerificationDecision;
  onClose: () => void;
}

export function VerificationDialog({ order, decision, onClose }: VerificationDialogProps) {
  const decide = useDecideVerification();
  const form = useForm<Values>({ defaultValues: { note: '' } });
  const { register } = form;
  const accept = decision === 'accept';

  const submit = dialogSubmit(
    form,
    async (values) => {
      const note = values.note.trim();
      await decide.mutateAsync({ order, body: { decision, ...(note ? { note } : {}) } });
    },
    { fields: ['note'] },
  );

  return (
    <FormDialog
      open
      title={accept ? `Accept the result of ${orderLabel(order)}?` : `Refund ${orderLabel(order)}?`}
      sub={order.reviewReason ?? undefined}
      confirm={accept ? 'Accept result' : 'Refund'}
      kind={accept ? 'primary' : 'danger'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink2">
          {accept
            ? 'The delivered result stands and the charge is kept.'
            : 'The buyer gets the money back for this order.'}
        </p>
        <TextField
          label="Note (optional)"
          maxLength={140}
          autoComplete="off"
          hint="Kept in the order timeline."
          {...register('note')}
        />
      </div>
    </FormDialog>
  );
}

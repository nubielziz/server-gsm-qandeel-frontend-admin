// ReopenDialog: "Reopen <order>" (`POST /admin/orders/:id/reopen`). The demo has no reopen; the map adds it, behind its own
// permission, for a completed order that has to be redone. Built in the demo's dialog style (MISMATCHES M31).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField } from '@/components/ui';
import { useReopenOrder } from '../hooks/useOrderMutations';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';

type Values = { reason: string };

export function ReopenDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const reopen = useReopenOrder();
  const form = useForm<Values>({ defaultValues: { reason: '' } });
  const { register } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const reason = values.reason.trim();
      await reopen.mutateAsync({ order, body: reason ? { reason } : {} });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={`Reopen ${orderLabel(order)}?`}
      sub="The order goes back to Processing so it can be completed or rejected again."
      confirm="Reopen order"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink2">
          The server posts the ledger entries this needs. The buyer may already have used the result, so check
          first.
        </p>
        <TextField label="Reason (optional)" maxLength={140} autoComplete="off" {...register('reason')} />
      </div>
    </FormDialog>
  );
}

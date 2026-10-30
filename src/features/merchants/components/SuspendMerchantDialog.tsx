// SuspendMerchantDialog: "Suspend <merchant>" (the demo's `m-suspend` action) with a reason that goes to the audit log. They cannot
// place new orders; open orders keep processing and the wallet stays as it is.
import { useForm } from 'react-hook-form';
import { FormDialog, TextField, dialogSubmit } from '@/components/ui';
import { useSuspendClient } from '../hooks/useClientMutations';
import { cleanText } from '../lib/input';
import type { Client } from '../types';

/** Asks for a reason and suspends the merchant. The reason goes to the audit log; the server's refusal shows in the dialog. */
export function SuspendMerchantDialog({
  client,
  onClose,
}: {
  client: Pick<Client, 'id' | 'name'>;
  onClose: () => void;
}) {
  const suspend = useSuspendClient();
  const form = useForm<{ reason: string }>({ defaultValues: { reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async ({ reason }) => {
      await suspend.mutateAsync({ client, reason: cleanText(reason) });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={`Suspend ${client.name}`}
      sub="They cannot place new orders. Open orders keep processing and their wallet stays intact."
      confirm="Suspend merchant"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <TextField
        label="Reason"
        maxLength={140}
        placeholder="e.g. Chargeback dispute"
        autoComplete="off"
        hint="Visible to staff only."
        error={errors.reason}
        {...register('reason', {
          validate: (value) => cleanText(value).length >= 3 || 'Add a short reason.',
        })}
      />
    </FormDialog>
  );
}

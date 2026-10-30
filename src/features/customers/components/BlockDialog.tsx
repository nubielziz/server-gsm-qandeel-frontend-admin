// BlockDialog: "Block <name>?" (the demo's `cu-block` action): a reason from a short list. Blocking is for fraud: they cannot
// place new orders and the blocklist gets an entry. Use Suspend for a temporary stop.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, dialogSubmit } from '@/components/ui';
import { useBlockCustomer } from '../hooks/useCustomerMutations';
import { BLOCK_REASONS } from '../lib/status';
import type { CustomerDetail } from '../types';

type Values = { reason: string };

const REASONS = [
  { value: '', label: 'Choose a reason' },
  ...BLOCK_REASONS.map((reason) => ({ value: reason, label: reason })),
];

export interface BlockDialogProps {
  customer: CustomerDetail;
  onClose: () => void;
}

/** Blocks a customer with a reason (required, for the audit log). */
export function BlockDialog({ customer, onClose }: BlockDialogProps) {
  const block = useBlockCustomer();
  const form = useForm<Values>({ defaultValues: { reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await block.mutateAsync({ customer, reason: values.reason });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={`Block ${customer.name}?`}
      sub="They can’t place new orders. Existing orders finish normally."
      confirm="Block customer"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Reason"
          selectWrapClassName="w-full"
          options={REASONS}
          error={errors.reason}
          {...register('reason', { required: 'Choose a reason for the audit log.' })}
        />
        <p className="text-xs text-ink3">
          Their email is added to the blocklist. You can unblock them later.
        </p>
      </div>
    </FormDialog>
  );
}

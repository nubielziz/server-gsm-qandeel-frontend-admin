// SuspendDialog: "Suspend <name>?" (the demo's `cu-suspend` action): a reason from a short list plus an optional note. They
// cannot sign in or place new orders, orders in progress finish, and nothing is added to the blocklist.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, dialogSubmit } from '@/components/ui';
import { useSuspendCustomer } from '../hooks/useCustomerMutations';
import { SUSPEND_REASONS } from '../lib/status';
import type { CustomerDetail } from '../types';

type Values = { reason: string; note: string };

const REASONS = [
  { value: '', label: 'Choose a reason' },
  ...SUSPEND_REASONS.map((reason) => ({ value: reason, label: reason })),
];

export interface SuspendDialogProps {
  customer: CustomerDetail;
  onClose: () => void;
}

/** Suspends a customer with a reason (required, for the audit log) and an optional note. */
export function SuspendDialog({ customer, onClose }: SuspendDialogProps) {
  const suspend = useSuspendCustomer();
  const form = useForm<Values>({ defaultValues: { reason: '', note: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await suspend.mutateAsync({ customer, reason: values.reason, note: values.note.trim() || undefined });
    },
    { fields: ['reason', 'note'] },
  );

  return (
    <FormDialog
      open
      title={`Suspend ${customer.name}?`}
      sub="They can’t sign in or place new orders. Orders already in progress finish normally."
      confirm="Suspend account"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Reason"
          selectWrapClassName="w-full"
          options={REASONS}
          hint="Shown to your team only."
          error={errors.reason}
          {...register('reason', { required: 'Choose a reason for the audit log.' })}
        />
        <TextareaField
          label="Note (optional)"
          rows={2}
          maxLength={200}
          placeholder="What did they tell you?"
          error={errors.note}
          {...register('note')}
        />
        <p className="text-xs text-ink3">
          Nothing is added to the blocklist. You can reactivate the account at any time.
        </p>
      </div>
    </FormDialog>
  );
}

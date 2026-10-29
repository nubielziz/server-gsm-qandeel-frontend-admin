// SuspendDialog: "Suspend <name>?" (the demo's `ad-suspend` action): a reason from a short list plus an optional note.
// Their sessions end and they cannot sign in until reactivated.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { useSuspendStaff } from '../hooks/useStaffMutations';
import type { Guard } from '../lib/ipGuards';
import { ADMIN_SUSPEND_REASONS, suspendReason } from '../lib/staffInput';
import { devicesText } from '../lib/staffText';
import type { StaffMember } from '../types';

type Values = { reason: string; note: string };

const REASONS = [
  { value: '', label: 'Choose a reason' },
  ...ADMIN_SUSPEND_REASONS.map((reason) => ({ value: reason, label: reason })),
];

export interface SuspendDialogProps {
  staff: StaffMember;
  /** The client hint for this account (not yourself, not the last Owner); a refusal stops the request and says why. */
  guard: Guard;
  onClose: () => void;
}

/**
 * Suspends an admin with a reason. A client hint that says no (yourself, the last Owner) stops the request
 * and shows why.
 */
export function SuspendDialog({ staff, guard, onClose }: SuspendDialogProps) {
  const suspend = useSuspendStaff();
  const form = useForm<Values>({ defaultValues: { reason: '', note: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!guard.ok) return guard.reason;
      await suspend.mutateAsync({ staff, reason: suspendReason(values.reason, values.note) });
    },
    { fields: ['reason', 'note'] },
  );

  return (
    <FormDialog
      open
      title={`Suspend ${staff.name}?`}
      sub="They cannot sign in until you reactivate them."
      confirm="Suspend admin"
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
          {...register('reason', { required: 'Choose a reason so the next person knows why.' })}
        />
        <TextField label="Note (optional)" maxLength={140} autoComplete="off" {...register('note')} />
        <ul className="list-disc space-y-1 ps-5 text-sm text-ink2">
          <li>
            Every session ends now{staff.activeSessions ? ` (${devicesText(staff.activeSessions)})` : ''}.
          </li>
          <li>Their name stays on past actions in the audit log.</li>
          <li>You can reactivate them at any time.</li>
        </ul>
      </div>
    </FormDialog>
  );
}

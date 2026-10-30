// KycDecisionDialog: Approve or Reject a verification request. A rejection needs a reason, which is saved with the decision;
// an approval takes an optional note. The server updates the merchant's verification status and refuses a request that was
// already decided, and the dialog shows its answer.
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { useDecideKyc } from '../hooks/useKycSubmissions';
import { cleanText } from '../lib/input';
import type { KycDecision, KycSubmission } from '../types';

export interface KycDecisionDialogProps {
  submission: KycSubmission;
  decision: KycDecision;
  onClose: () => void;
}

/** Collects the reason (or note) and sends the decision. The server's answer shows in the dialog. */
export function KycDecisionDialog({ submission, decision, onClose }: KycDecisionDialogProps) {
  const decide = useDecideKyc();
  const form = useForm<{ note: string }>({ defaultValues: { note: '' } });
  const {
    register,
    formState: { errors },
  } = form;
  const reject = decision === 'reject';

  const submit = dialogSubmit(
    form,
    async ({ note }) => {
      const text = cleanText(note);
      await decide.mutateAsync({ submission, body: { decision, ...(text ? { note: text } : {}) } });
    },
    { fields: ['note'] },
  );

  return (
    <FormDialog
      open
      title={
        reject
          ? `Reject the verification of ${submission.client.name}?`
          : `Approve ${submission.client.name}?`
      }
      sub={
        reject
          ? 'Their documents are marked as rejected. They can submit new ones.'
          : 'Their identity check is marked as approved.'
      }
      confirm={reject ? 'Reject verification' : 'Approve verification'}
      kind={reject ? 'danger' : 'primary'}
      onClose={onClose}
      onSubmit={submit}
    >
      <TextareaField
        label={reject ? 'Reason' : 'Note (optional)'}
        maxLength={300}
        hint={reject ? 'Saved with the decision so the next reviewer knows why.' : undefined}
        error={errors.note}
        {...register('note', {
          validate: (value) => !reject || cleanText(value) !== '' || 'Add a reason for the rejection.',
        })}
      />
    </FormDialog>
  );
}

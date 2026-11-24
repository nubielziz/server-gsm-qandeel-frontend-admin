// SuspendDialog: "Suspend <name>?" for one account, or "Suspend <n> accounts?" for the ticked ones of the list: a reason from a short list plus
// a note. They cannot sign in, call the API or place new orders; open orders finish and the wallet stays as it is; nothing is added to the
// blocklist. It merges the merchant's and the customer's dialogs. Many accounts run one request each, in order, with a progress line.
import { useForm } from 'react-hook-form';
import { BulkSummaryDialog, FormDialog, SelectField, TextareaField, dialogSubmit } from '@/components/ui';
import { updateAccount } from '../../api';
import { useSuspendAccount } from '../../hooks/useAccountMutations';
import { dialogTitle } from '../shared/dialogTitles';
import type { ManyAccountsDialogProps } from '../types';
import { NOTE_LIMIT, OTHER_REASON, SUSPEND_REASONS, noteProblem, suspendReasonText } from './reasons';
import { useBulkStatus } from './useBulkStatus';

type Values = { reason: string; note: string };

const REASONS = [
  { value: '', label: 'Choose a reason' },
  ...SUSPEND_REASONS.map((reason) => ({ value: reason, label: reason })),
];

const UNIT = { one: 'account', many: 'accounts' };

/**
 * Suspends one account, or each of many in turn, with the same reason for the audit log.
 *
 * @param props the accounts to suspend (the host gives only the ones that can be) and the close handler
 * Side effects: `PATCH /admin/clients/:id { status: 'suspended', reason }` per account; the lists, records and counts go stale; a toast, or
 * a summary of the accounts the server refused. A refusal for one account stays in the dialog, which stays open.
 */
export function SuspendDialog({ accounts, onClose }: ManyAccountsDialogProps) {
  const [first] = accounts;
  const many = accounts.length > 1;
  const suspend = useSuspendAccount();
  const bulk = useBulkStatus();
  const form = useForm<Values>({ defaultValues: { reason: '', note: '' } });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const other = watch('reason') === OTHER_REASON;

  const submit = dialogSubmit(
    form,
    async ({ reason, note }) => {
      const text = suspendReasonText(reason, note);
      if (!many) {
        if (first) await suspend.mutateAsync({ account: first, reason: text });
        return;
      }
      const everyone = await bulk.runOver('Suspending', 'suspended', accounts, (account) =>
        updateAccount(account.id, { status: 'suspended', reason: text }),
      );
      // Some were refused: the summary takes the dialog's place, so this one must not close on its own.
      return everyone ? undefined : false;
    },
    { fields: ['reason', 'note'] },
  );

  if (bulk.summary) return <BulkSummaryDialog summary={bulk.summary} unit={UNIT} onClose={onClose} />;
  return (
    <FormDialog
      open
      title={dialogTitle('suspend', accounts)}
      sub="They cannot sign in, call the API or place new orders. Open orders finish and the wallet stays as it is. Nothing is added to the blocklist."
      confirm="Suspend"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Reason"
          selectWrapClassName="w-full"
          options={REASONS}
          hint={
            many
              ? 'Shown to your team only. The same reason is kept for every account.'
              : 'Shown to your team only.'
          }
          error={errors.reason}
          {...register('reason', { required: 'Choose a reason for the audit log.' })}
        />
        <TextareaField
          label={other ? 'Note' : 'Note (optional)'}
          rows={2}
          placeholder="What did they tell you?"
          hint={`At most ${NOTE_LIMIT} characters.`}
          error={errors.note}
          {...register('note', { validate: (value, values) => noteProblem(values.reason, value) })}
        />
        {bulk.progress && (
          <p className="text-sm text-ink2" role="status">
            {bulk.progress.verb} {bulk.progress.done} of {bulk.progress.total}…
          </p>
        )}
      </div>
    </FormDialog>
  );
}

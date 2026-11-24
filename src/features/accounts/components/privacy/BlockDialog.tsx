// BlockDialog: "Block <name>?". A block is for fraud: sign-in and orders stop, every session ends, API keys stop, and the email goes on the
// blocklist with the card fingerprints and the IMEIs of the shop orders. A reason from a short list is required (it goes to the audit log);
// the server takes exactly one of those reasons, so there is no free note. The server's refusal stays in the dialog, which stays open.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, dialogSubmit } from '@/components/ui';
import { useBlockAccount } from '../../hooks/useAccountPrivacy';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import { BLOCK_REASON_OPTIONS } from './blockReasons';

type Values = { reason: string };

/**
 * Blocks one account with one of the reasons. Needs `clients:block` (the dialog is offered only with it).
 *
 * @param props.account the account to block (active or suspended).
 * @param props.onClose asks the host to close the dialog (done, or cancelled).
 * @see POST /admin/clients/:id/block
 */
export function BlockDialog({ account, onClose }: AccountDialogProps) {
  const block = useBlockAccount();
  const form = useForm<Values>({ defaultValues: { reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async ({ reason }) => {
      await block.mutateAsync({ account, reason });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={dialogTitle('block', [account])}
      confirm="Block account"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink2">
          For fraud. Sign-in and orders stop, every session ends, API keys stop, and the email goes on the
          blocklist with the card fingerprints and the IMEIs of their shop orders. Use Suspend for a pause.
        </p>
        <SelectField
          label="Reason"
          selectWrapClassName="w-full"
          options={BLOCK_REASON_OPTIONS}
          error={errors.reason}
          {...register('reason', { required: 'Choose a reason for the audit log.' })}
        />
      </div>
    </FormDialog>
  );
}

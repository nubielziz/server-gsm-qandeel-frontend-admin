// AddBlockDialog: "Add to blocklist" (the demo's `bl-add`): what to block, the value and a reason. The order is refused at
// checkout and the customer sees a neutral message. The client only checks the obvious (a value, 15 digits for an IMEI, a
// reason); the server checks again and says so under the field, a duplicate included.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField } from '@/components/ui';
import { useCreateBlock } from '../hooks/useBlocklistMutations';
import { blockReasonHint, blockValueHint, toCreateBody } from '../lib/blocklist';
import { ADDABLE_KINDS, BLOCK_KIND_LABEL } from '../lib/labels';
import type { AddableBlockKind } from '../types';

type Values = { kind: AddableBlockKind; value: string; reason: string };

const KIND_OPTIONS = ADDABLE_KINDS.map((kind) => ({ value: kind, label: BLOCK_KIND_LABEL[kind] }));

export function AddBlockDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateBlock();
  const form = useForm<Values>({ defaultValues: { kind: 'email', value: '', reason: '' } });
  const {
    register,
    getValues,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await create.mutateAsync(toCreateBody(values));
    },
    // The map names no error code for a duplicate; the code assumed here puts it under the value.
    { fields: ['kind', 'value', 'reason'], codeFields: { ALREADY_BLOCKED: 'value' } },
  );

  return (
    <FormDialog
      open
      title="Add to blocklist"
      sub="The order is refused at checkout and the customer sees a neutral message."
      confirm="Block"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="What to block"
          selectWrapClassName="w-full"
          options={KIND_OPTIONS}
          error={errors.kind}
          {...register('kind')}
        />
        <TextField
          label="Value"
          className="mono"
          type="text"
          placeholder="name@example.com"
          autoComplete="off"
          spellCheck={false}
          hint="An email, a domain like example.com, a 15-digit IMEI or a card fingerprint. IP addresses are blocked under Admins and access."
          error={errors.value}
          {...register('value', { validate: (value) => blockValueHint(getValues('kind'), value) ?? true })}
        />
        <TextField
          label="Reason"
          type="text"
          placeholder="Card testing, stolen device…"
          autoComplete="off"
          hint="Only your team sees this."
          error={errors.reason}
          {...register('reason', { validate: (value) => blockReasonHint(value) ?? true })}
        />
      </div>
    </FormDialog>
  );
}

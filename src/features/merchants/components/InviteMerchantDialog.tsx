// InviteMerchantDialog: "Invite merchant" (the demo's `m-invite` action): business name, contact email, country, price group and
// an optional credit limit. The server emails the sign-up link and keeps the account pending until staff approve it. A duplicate
// email comes back as 409 `EMAIL_TAKEN` and shows under the email field.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { useInviteClient } from '../hooks/useClientMutations';
import { parseAmount } from '../lib/amount';
import { defaultGroupId, groupLabel, merchantGroups } from '../lib/groups';
import { cleanCountry, cleanEmail, cleanText, validCountry, validEmail } from '../lib/input';
import type { ClientGroup, CreateClientBody } from '../types';

type Values = { name: string; email: string; country: string; groupId: string; creditLimit: string };
const FIELDS = ['name', 'email', 'country', 'groupId', 'creditLimit'] as const;

export interface InviteMerchantDialogProps {
  /** The groups to choose from; `undefined` when they cannot be read, and the server then picks its default group. */
  groups?: readonly ClientGroup[];
  onClose: () => void;
}

/** Mounted only while open, so every opening starts with empty fields. */
export function InviteMerchantDialog({ groups, onClose }: InviteMerchantDialogProps) {
  const invite = useInviteClient();
  const choices = merchantGroups(groups ?? []);
  const form = useForm<Values>({
    defaultValues: {
      name: '',
      email: '',
      country: '',
      groupId: String(defaultGroupId(choices) ?? ''),
      creditLimit: '',
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const creditLimit = parseAmount(values.creditLimit, { allowZero: true });
      const body: CreateClientBody = {
        name: cleanText(values.name),
        email: cleanEmail(values.email),
        country: cleanCountry(values.country),
        ...(values.groupId ? { groupId: Number(values.groupId) } : {}),
        ...(creditLimit ? { creditLimit } : {}),
        invite: true,
      };
      await invite.mutateAsync(body);
    },
    { fields: FIELDS, codeFields: { EMAIL_TAKEN: 'email' } },
  );

  return (
    <FormDialog
      open
      title="Invite merchant"
      sub="They receive a sign-up link. The account stays pending until you approve it."
      confirm="Send invitation"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Business name"
          placeholder="Example Mobile Repair"
          autoComplete="off"
          error={errors.name}
          {...register('name', {
            validate: (value) => cleanText(value) !== '' || 'Enter the business name.',
          })}
        />
        <TextField
          label="Contact email"
          type="text"
          inputMode="email"
          placeholder="owner@example.com"
          autoComplete="off"
          spellCheck={false}
          error={errors.email}
          {...register('email', {
            validate: (value) => validEmail(value) || 'Enter a valid email address, like owner@example.com.',
          })}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Country"
            placeholder="JO"
            maxLength={2}
            autoComplete="off"
            hint="Two letters, like JO or AE."
            error={errors.country}
            {...register('country', {
              validate: (value) => validCountry(value) || 'Enter the two-letter country code.',
            })}
          />
          <TextField
            label="Credit limit (USD, optional)"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            hint="How far below zero the wallet may go."
            error={errors.creditLimit}
            {...register('creditLimit', {
              validate: (value) =>
                value.trim() === '' ||
                parseAmount(value, { allowZero: true }) !== null ||
                'Enter an amount like 500.00, or leave it empty.',
            })}
          />
        </div>
        {groups && (
          <SelectField
            label="Price group"
            selectWrapClassName="w-full"
            options={[
              { value: '', label: 'Default group' },
              ...choices.map((group) => ({ value: group.id, label: groupLabel(group) })),
            ]}
            error={errors.groupId}
            {...register('groupId')}
          />
        )}
      </div>
    </FormDialog>
  );
}

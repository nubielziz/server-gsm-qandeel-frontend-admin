// GroupDialog: create or edit a merchant group (a tab the demo lacks, MISMATCHES M46): name, discount, upgrade threshold, deposit
// limit, and two switches. Only what changed is sent when editing.
import { useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, TextField, dialogSubmit, toast } from '@/components/ui';
import { useCreateGroup, useUpdateGroup } from '../hooks/useClientGroups';
import { amountInput, parseAmount, parsePercent } from '../lib/amount';
import { cleanText } from '../lib/input';
import type { ClientGroup, CreateClientGroupBody, UpdateClientGroupBody } from '../types';

type Values = {
  name: string;
  discount: string;
  threshold: string;
  deposit: string;
  overdraftAllowed: boolean;
  isDefault: boolean;
};
const FIELDS = ['name', 'discount', 'threshold', 'deposit', 'overdraftAllowed', 'isDefault'] as const;

// The API calls the fields discountPercent, earnThreshold and depositLimit; the form uses the words of the column headers.
const ALIASES = { discountPercent: 'discount', earnThreshold: 'threshold', depositLimit: 'deposit' };

export interface GroupDialogProps {
  /** The group to edit; leave out to create one. */
  group?: ClientGroup;
  onClose: () => void;
}

// Whether two decimal texts are the same number ("4" and "4.0000"). Only decides whether a field is sent.
const same = (a: string, b: string) => Number(a) === Number(b);

/** Creates a group, or edits one when `group` is given. */
export function GroupDialog({ group, onClose }: GroupDialogProps) {
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const form = useForm<Values>({
    defaultValues: {
      name: group?.name ?? '',
      discount: group ? String(Number(group.discountPercent)) : '0',
      threshold: group ? amountInput(group.earnThreshold) : '0.00',
      deposit: group ? amountInput(group.depositLimit) : '0.00',
      overdraftAllowed: group?.overdraftAllowed ?? false,
      isDefault: group?.isDefault ?? false,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      // The fields were checked by the form's rules, so these parse; the fallbacks only satisfy the types.
      const next: CreateClientGroupBody = {
        name: cleanText(values.name),
        discountPercent: parsePercent(values.discount) ?? '0',
        earnThreshold: parseAmount(values.threshold, { allowZero: true }) ?? '0.0000',
        depositLimit: parseAmount(values.deposit, { allowZero: true }) ?? '0.0000',
        overdraftAllowed: values.overdraftAllowed,
        isDefault: values.isDefault,
      };
      if (!group) {
        await create.mutateAsync(next);
        return;
      }
      const body: UpdateClientGroupBody = {};
      if (next.name !== group.name) body.name = next.name;
      if (!same(next.discountPercent, group.discountPercent)) body.discountPercent = next.discountPercent;
      if (!same(next.earnThreshold, group.earnThreshold)) body.earnThreshold = next.earnThreshold;
      if (!same(next.depositLimit, group.depositLimit)) body.depositLimit = next.depositLimit;
      if (next.overdraftAllowed !== group.overdraftAllowed) body.overdraftAllowed = next.overdraftAllowed;
      if (next.isDefault !== group.isDefault) body.isDefault = next.isDefault;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ group, body });
    },
    { fields: FIELDS, aliases: ALIASES },
  );

  return (
    <FormDialog
      open
      title={group ? `Edit ${group.name}` : 'New group'}
      sub="A group sets the discount, the upgrade threshold and the deposit limit its merchants get."
      confirm={group ? 'Save changes' : 'Create group'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Group name"
          maxLength={60}
          autoComplete="off"
          error={errors.name}
          {...register('name', { validate: (value) => cleanText(value) !== '' || 'Enter a group name.' })}
        />
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label="Discount (%)"
            inputMode="decimal"
            autoComplete="off"
            hint="Off base prices."
            error={errors.discount}
            {...register('discount', {
              validate: (value) => parsePercent(value) !== null || 'Enter a percent from 0 to 100.',
            })}
          />
          <TextField
            label="Upgrade threshold (USD)"
            inputMode="decimal"
            autoComplete="off"
            hint="Spend that moves a merchant up."
            error={errors.threshold}
            {...register('threshold', {
              validate: (value) =>
                parseAmount(value, { allowZero: true }) !== null || 'Enter an amount like 5000.00.',
            })}
          />
          <TextField
            label="Deposit limit (USD)"
            inputMode="decimal"
            autoComplete="off"
            hint="Most a merchant may add at once."
            error={errors.deposit}
            {...register('deposit', {
              validate: (value) =>
                parseAmount(value, { allowZero: true }) !== null || 'Enter an amount like 20000.00.',
            })}
          />
        </div>
        <CheckboxField
          label="Merchants in this group can use a credit limit"
          error={errors.overdraftAllowed}
          {...register('overdraftAllowed')}
        />
        <CheckboxField
          label="New merchants start in this group"
          error={errors.isDefault}
          {...register('isDefault')}
        />
        {group && (group.merchantCount ?? 0) > 0 && (
          <p className="text-xs text-ink3">
            {group.merchantCount} {group.merchantCount === 1 ? 'merchant is' : 'merchants are'} in this group.
            A change applies to their next order.
          </p>
        )}
      </div>
    </FormDialog>
  );
}

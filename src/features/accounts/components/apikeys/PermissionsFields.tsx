// PermissionsFields: the "Permissions" section of the two key dialogs (decision 039): what a key may do is the addresses that may use it and
// the period it is valid, so both boxes are always in view: "Allowed IP addresses" (one per line; empty means any address) and "Valid until" (a
// day; empty means no end). Used by the new key form and the edit form, which share the same four values.
import type { UseFormReturn } from 'react-hook-form';
import { TextareaField, TextField } from '@/components/ui';
import { dayIsPast, MAX_ALLOWED_IPS, parseIpLines } from './keyInput';

/** The values of both key forms. The limit sits under "More options" in each. */
export type KeyFormValues = {
  name: string;
  allowedIps: string;
  validUntil: string;
  rateLimitPerMin: string;
};

export interface PermissionsFieldsProps {
  form: Pick<UseFormReturn<KeyFormValues>, 'register' | 'formState'>;
  /** Rows of the address box. */
  rows?: number;
  /** The day the key is valid until now, when editing: a day that has passed is refused only when it was changed to one. */
  unchangedDay?: string;
}

/** The section. It is a named group, so a screen reader hears "Permissions" before the two boxes. */
export function PermissionsFields({ form, rows = 3, unchangedDay }: PermissionsFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-semibold">Permissions</legend>
      <TextareaField
        label="Allowed IP addresses"
        rows={rows}
        placeholder={'203.0.113.55\n198.51.100.0/24'}
        spellCheck={false}
        hint={`One address or range per line, at most ${MAX_ALLOWED_IPS}. Empty: any address may use the key.`}
        error={errors.allowedIps}
        {...register('allowedIps', {
          validate: (value) =>
            parseIpLines(value).length <= MAX_ALLOWED_IPS || `Use at most ${MAX_ALLOWED_IPS} addresses.`,
        })}
      />
      <TextField
        label="Valid until"
        type="date"
        hint="Empty: the key has no end. It stops working at the end of that day."
        error={errors.validUntil}
        {...register('validUntil', {
          validate: (value) =>
            value === unchangedDay || !dayIsPast(value) || 'Choose a day that is still ahead.',
        })}
      />
    </fieldset>
  );
}

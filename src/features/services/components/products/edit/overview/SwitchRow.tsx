// SwitchRow: one two-part switch of the Overview part tied to its form row (label on the left, YesNo on the right, the hint and the
// server's refusal under it). Split from OverviewFields to keep that file short.
import { Controller, type UseFormReturn } from 'react-hook-form';
import { FormRow, YesNo } from '@/components/ui';
import type { OverviewValues } from './overviewForm';

export interface SwitchRowProps {
  form: UseFormReturn<OverviewValues>;
  name: 'active' | 'auto' | 'verify' | 'cancel' | 'stockDelivery';
  label: string;
  yes?: string;
  no?: string;
  hint?: string;
  /** A missing permission: the switch is off and its title says why. */
  lock: { disabled: boolean; title?: string };
}

/** One two-part switch tied to its row. */
export function SwitchRow({ form, name, label, yes, no, hint, lock }: SwitchRowProps) {
  const id = `overview-${name}`;
  return (
    <FormRow label={label} htmlFor={id} hint={hint} error={form.formState.errors[name]?.message}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <YesNo
            id={id}
            yes={yes}
            no={no}
            value={field.value}
            onChange={field.onChange}
            disabled={lock.disabled}
            title={lock.title}
          />
        )}
      />
    </FormRow>
  );
}

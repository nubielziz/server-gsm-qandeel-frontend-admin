// AddServiceFields: the rows of the +Add Service form, in the order of the layout the owner asked for: Service Name (with its "- Select -" menu),
// Code, Service Listed In Group, then the settings (ServiceTermsRows). Label on the left, control on the right; every message under its row.
import type { UseFormReturn } from 'react-hook-form';
import { TextField } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import type { AddServiceValues } from './addServiceForm';
import { ServiceGroupRow } from './ServiceGroupRow';
import { ServiceNameRow } from './ServiceNameRow';
import { ServiceTermsRows } from './ServiceTermsRows';

export interface AddServiceFieldsProps {
  form: UseFormReturn<AddServiceValues>;
  type: ServiceType;
  grants: ServiceGrants;
}

/** "Code *": a row of its own component, so each row registers its field in the order it is drawn (the first row with an error takes the focus). */
function CodeRow({ form }: { form: UseFormReturn<AddServiceValues> }) {
  return (
    <TextField
      layout="row"
      label="Code"
      required
      className="mono"
      autoComplete="off"
      spellCheck={false}
      maxLength={40}
      hint="A short unique code, such as IMEI-ATT-USA."
      error={form.formState.errors.code}
      {...form.register('code', { validate: (value) => value.trim() !== '' || 'Enter a code.' })}
    />
  );
}

/** The fields only: the form around them, its bar and its save belong to AddServiceForm. */
export function AddServiceFields({ form, type, grants }: AddServiceFieldsProps) {
  return (
    <div>
      <ServiceNameRow form={form} type={type} grants={grants} />
      <CodeRow form={form} />
      <ServiceGroupRow form={form} type={type} />
      <ServiceTermsRows form={form} grants={grants} />
    </div>
  );
}

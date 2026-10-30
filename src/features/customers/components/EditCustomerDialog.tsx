// EditCustomerDialog: "Edit <name>" (the demo's `cu-edit` action): name, email, country, language, phone and internal notes.
// Nothing is sent when nothing changed; otherwise only the changed fields are.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, TextField, dialogSubmit, toast } from '@/components/ui';
import { useUpdateCustomer } from '../hooks/useCustomerMutations';
import { countryOptions } from '../lib/countries';
import { changedFields, cleanName, validEmail, type EditValues } from '../lib/input';
import { LOCALES } from '../lib/status';
import type { CustomerDetail } from '../types';

const FIELDS = ['name', 'email', 'country', 'locale', 'phone', 'internalNotes'] as const;

export interface EditCustomerDialogProps {
  customer: CustomerDetail;
  onClose: () => void;
}

/** The form for editing a customer. It sends only the fields that changed, and nothing at all when none did. */
export function EditCustomerDialog({ customer, onClose }: EditCustomerDialogProps) {
  const update = useUpdateCustomer();
  const form = useForm<EditValues>({
    defaultValues: {
      name: customer.name,
      email: customer.email,
      country: customer.country,
      locale: customer.locale,
      phone: customer.phone,
      internalNotes: customer.internalNotes,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = changedFields(customer, values);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ customer, body });
    },
    { fields: FIELDS, codeFields: { EMAIL_TAKEN: 'email' } },
  );

  return (
    <FormDialog
      open
      title={`Edit ${customer.name}`}
      sub="Changes are written to the audit log."
      confirm="Save changes"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Full name"
            wrapperClassName="sm:col-span-2"
            autoComplete="off"
            error={errors.name}
            {...register('name', {
              validate: (value) => cleanName(value).length >= 2 || 'Enter the customer’s name.',
            })}
          />
          <TextField
            label="Email"
            wrapperClassName="sm:col-span-2"
            type="text"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            hint={
              customer.hasAccount
                ? 'If you change it, they must confirm the new address before it counts as verified.'
                : 'Receipts and the order link are sent here.'
            }
            error={errors.email}
            {...register('email', {
              validate: (value) => validEmail(value) || 'Enter a valid email address.',
            })}
          />
          <SelectField
            label="Country"
            selectWrapClassName="w-full"
            options={countryOptions(customer.country)}
            hint="Applies to new orders. Past orders keep their price and VAT."
            error={errors.country}
            {...register('country')}
          />
          <SelectField
            label="Language"
            selectWrapClassName="w-full"
            options={LOCALES}
            error={errors.locale}
            {...register('locale')}
          />
          <TextField
            label="Phone"
            wrapperClassName="sm:col-span-2"
            type="text"
            inputMode="tel"
            autoComplete="off"
            error={errors.phone}
            {...register('phone')}
          />
          <TextareaField
            label="Internal notes"
            wrapperClassName="sm:col-span-2"
            rows={3}
            maxLength={300}
            placeholder="Only your team sees this"
            error={errors.internalNotes}
            {...register('internalNotes')}
          />
        </div>
      </div>
    </FormDialog>
  );
}

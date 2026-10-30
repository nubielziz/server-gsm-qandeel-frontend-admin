// EditConnectionDialog: "Edit connection": changes a supplier's name, API type, URL, account, key, currency, alert and limits
// (`PATCH /admin/suppliers/:id`). The demo has no such action. Only the fields that changed are sent, and nothing at all when
// none did; an empty key field keeps the stored key.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, toast } from '@/components/ui';
import { useUpdateSupplier } from '../hooks/useSupplierMutations';
import { changedFields, SUPPLIER_FIELDS, valuesOf, type SupplierFormValues } from '../lib/input';
import type { Supplier } from '../types';
import { SupplierFields } from './SupplierFields';

export interface EditConnectionDialogProps {
  supplier: Supplier;
  onClose: () => void;
}

/** The connection form filled with the supplier's values; saving sends only the fields that changed. */
export function EditConnectionDialog({ supplier, onClose }: EditConnectionDialogProps) {
  const update = useUpdateSupplier();
  const form = useForm<SupplierFormValues>({ defaultValues: valuesOf(supplier) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = changedFields(supplier, values);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ supplier, body });
    },
    { fields: SUPPLIER_FIELDS },
  );

  return (
    <FormDialog
      open
      title={`Edit ${supplier.name}`}
      sub="Changes are written to the audit log. Test the connection after changing the key or the URL."
      confirm="Save changes"
      onClose={onClose}
      onSubmit={submit}
    >
      <SupplierFields form={form} editing />
    </FormDialog>
  );
}

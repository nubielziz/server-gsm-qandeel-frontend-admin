// OrderFormFields: the custom fields of a service in the Order form section: each one's label, type and whether it is required,
// in the order the buyer sees them, or a note when there are none.
import { Badge } from '@/components/ui';
import type { ServiceField } from '../../../types';
import { OrderFormGroup, type PermissionHint } from './OrderFormGroup';
import { fieldTypeLabel } from './orderFormSummary';

export interface OrderFormFieldsProps {
  fields: readonly ServiceField[];
  lock: PermissionHint;
  onEdit: () => void;
}

/** The saved fields as a numbered list, with "Edit fields…" beside the heading. */
export function OrderFormFields({ fields, lock, onEdit }: OrderFormFieldsProps) {
  return (
    <OrderFormGroup title="Fields" editLabel="Edit fields…" lock={lock} onEdit={onEdit}>
      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-line2 p-3 text-sm text-ink3">
          No order fields yet. The buyer only gives the main input (an IMEI, an account or a serial number).
        </p>
      ) : (
        <ol aria-label="Order fields" className="m-0 list-none divide-y divide-line p-0">
          {fields.map((field, index) => (
            <li key={`${index}-${field.key}`} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="w-4 shrink-0 text-xs text-ink3" aria-hidden="true">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 break-words font-medium">{field.label}</span>
              <span className="shrink-0 text-xs text-ink3">{fieldTypeLabel(field.fieldType)}</span>
              {field.required ? (
                <Badge tone="neutral">Required</Badge>
              ) : (
                <span className="shrink-0 text-xs text-ink3">Optional</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </OrderFormGroup>
  );
}

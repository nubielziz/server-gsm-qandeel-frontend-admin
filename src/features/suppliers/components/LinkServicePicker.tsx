// LinkServicePicker: the menu of a supplier's own services inside the "Edit links" dialog, for a supplier that was just added to the
// chain and has no service picked yet. It reads the supplier's service list (`GET /admin/suppliers/:id/services`).
import { SelectField } from '@/components/ui';
import { money } from '@/lib/format';
import { useSupplierCatalogue } from '../hooks/useSupplierCatalogue';
import type { DraftStep } from '../lib/links';
import type { SupplierService } from '../types';

/** Most of a supplier's services the menu offers; a longer list is for the import dialog's search. */
const PICK_LIMIT = 100;

/** Offers the supplier's services; choosing one calls `onPick` with it. Disabled until the list has loaded and has services. */
export function LinkServicePicker({
  step,
  onPick,
}: {
  step: DraftStep;
  onPick: (item: SupplierService) => void;
}) {
  const list = useSupplierCatalogue({ supplierId: step.supplierId, page: 1, pageSize: PICK_LIMIT });
  const items = list.data?.data ?? [];
  const placeholder = list.isLoading
    ? 'Loading…'
    : list.isError
      ? 'Could not load its services'
      : items.length === 0
        ? 'No services yet. Sync the supplier first.'
        : 'Choose its service…';
  return (
    <SelectField
      aria-label={`Service at ${step.supplierName}`}
      selectWrapClassName="mt-1 w-full"
      disabled={items.length === 0}
      value=""
      options={[
        { value: '', label: placeholder },
        ...items.map((item) => ({ value: item.id, label: `${item.name} · ${money(item.credit)}` })),
      ]}
      onChange={(event) => {
        const picked = items.find((item) => String(item.id) === event.target.value);
        if (picked) onPick(picked);
      }}
    />
  );
}

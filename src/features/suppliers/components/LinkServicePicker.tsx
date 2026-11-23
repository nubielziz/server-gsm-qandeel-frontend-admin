// LinkServicePicker: the menu of a supplier's own services inside the supplier chain editor (the "Edit links" dialog and the panel's
// Suppliers section), for a supplier that was just added to the chain and has no service picked yet. It reads the supplier's service
// list (`GET /admin/suppliers/:id/services`), and its search box asks the server, so a supplier with thousands of services is
// reachable by name.
import { useState } from 'react';
import { SearchInput, SelectField } from '@/components/ui';
import { money, num } from '@/lib/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useSupplierCatalogue } from '../hooks/useSupplierCatalogue';
import type { DraftStep, EditLock } from '../lib/links';
import type { SupplierService } from '../types';

/** Most of a supplier's services the menu lists at once; the search box narrows a longer list on the server. */
const PICK_LIMIT = 100;

/**
 * Offers the supplier's services; choosing one calls `onPick` with it. The search box (name, group or remote id, as the server
 * reads it) narrows the menu, and a list longer than the menu says how many there are. The menu and the box are disabled while
 * `lock` says the staff member may not change the chain; the menu is also off until the list has loaded and has services.
 */
export function LinkServicePicker({
  step,
  lock,
  onPick,
}: {
  step: DraftStep;
  lock: EditLock;
  onPick: (item: SupplierService) => void;
}) {
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim());
  const list = useSupplierCatalogue({ supplierId: step.supplierId, page: 1, pageSize: PICK_LIMIT, q });
  const items = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const title = lock.disabled ? lock.title : undefined;
  const placeholder = list.isLoading
    ? 'Loading…'
    : list.isError
      ? 'Could not load its services'
      : items.length === 0
        ? q === ''
          ? 'No services yet. Sync the supplier first.'
          : 'No service matches. Change the search.'
        : 'Choose its service…';
  return (
    <div className="mt-1 space-y-1.5">
      <SearchInput
        value={text}
        onChange={setText}
        placeholder={`Search ${step.supplierName}'s services`}
        disabled={lock.disabled}
        title={title}
        // Enter must not submit the form around the chain (that would press Save links).
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
      <SelectField
        aria-label={`Service at ${step.supplierName}`}
        selectWrapClassName="w-full"
        disabled={lock.disabled || items.length === 0}
        title={title}
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
      {total > PICK_LIMIT && (
        <p className="text-xs text-ink3" aria-live="polite">
          Showing {num(PICK_LIMIT)} of {num(total)}. Type to narrow the list.
        </p>
      )}
    </div>
  );
}

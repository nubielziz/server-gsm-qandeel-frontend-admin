// SupplierList: the "All suppliers" panel on the left of the page, one button per supplier. Ports `supList` of 44-p-suppliers.js.
import type { Supplier } from '../types';
import { SupplierListItem } from './SupplierListItem';

export interface SupplierListProps {
  suppliers: readonly Supplier[];
  selectedId: number | undefined;
  onSelect: (id: number) => void;
}

export function SupplierList({ suppliers, selectedId, onSelect }: SupplierListProps) {
  return (
    <section className="panel lg:sticky lg:top-16" aria-label="Supplier list">
      <div className="panel-h">
        <h2 className="panel-t flex-1">All suppliers</h2>
      </div>
      <ul className="m-0 list-none divide-y divide-line p-0" aria-label="Suppliers">
        {suppliers.map((supplier) => (
          <SupplierListItem
            key={supplier.id}
            supplier={supplier}
            selected={supplier.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}

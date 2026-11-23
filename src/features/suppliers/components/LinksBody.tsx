// LinksBody: the body of the supplier chain editor, shared by the "Edit links" dialog and the panel's Suppliers section: the places
// in order (or a note when there is none) and the menu that adds a supplier. It holds no state; the draft hook does.
import { Button, SelectField } from '@/components/ui';
import type { SuppliersStatus } from '../hooks/useSuppliers';
import type { EditLock, DraftStep } from '../lib/links';
import type { Supplier, SupplierService } from '../types';
import { LinkRow } from './LinkRow';

export interface LinksBodyProps {
  steps: readonly DraftStep[];
  /** The suppliers the chain may use; the ones already in it are not offered again. */
  suppliers: readonly Pick<Supplier, 'id' | 'name'>[];
  /** For moving, removing and picking: the staff member needs `catalog:update`. */
  lock: EditLock;
  /** For the "Add a supplier" menu, which also reads the supplier list: `catalog:update` and `suppliers:read`. */
  addLock: EditLock;
  /**
   * Where the supplier list is: the menu says "Loading suppliers…" while it is read and "Supplier list unavailable" with Retry when it
   * failed, and only a list that was read and has nothing left to offer says "No other supplier".
   */
  suppliersStatus: SuppliersStatus;
  /** Reads the supplier list again (the Retry of a failed read). */
  onRetrySuppliers: () => void;
  onAdd: (supplier: Pick<Supplier, 'id' | 'name'>) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onPick: (key: string, item: SupplierService) => void;
}

/**
 * The chain as a list in priority order, then "Add a supplier". A server that refuses a disabled supplier says so when the chain is
 * saved. Without `suppliers:read` the list is not asked for, so the menu is off and its title names the permission.
 */
export function LinksBody({
  steps,
  suppliers,
  lock,
  addLock,
  suppliersStatus,
  onRetrySuppliers,
  onAdd,
  onMove,
  onRemove,
  onPick,
}: LinksBodyProps) {
  const inChain = new Set(steps.map((step) => step.supplierId));
  // Every supplier not yet in the chain is offered; the server decides whether a disabled one may be linked.
  const addable = suppliers.filter((supplier) => !inChain.has(supplier.id));
  // A menu that is off for the permission is not "loading" or "failed": the list was never asked for.
  const status = addLock.disabled ? 'ready' : suppliersStatus;
  const nothingToAdd = status === 'ready' && addable.length === 0 && !addLock.disabled;
  const menuLabel =
    status === 'loading'
      ? 'Loading suppliers…'
      : status === 'error'
        ? 'Supplier list unavailable'
        : nothingToAdd
          ? 'No other supplier'
          : 'Choose a supplier…';

  return (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <p className="rounded-md bg-sunken p-2.5 text-sm text-ink2">
          No supplier is linked. Orders for this service wait for manual dispatch.
        </p>
      ) : (
        <ol className="m-0 list-none space-y-2 p-0" aria-label="Suppliers in order">
          {steps.map((step, index) => (
            <LinkRow
              key={step.key}
              step={step}
              index={index}
              count={steps.length}
              lock={lock}
              onMove={onMove}
              onRemove={onRemove}
              onPick={onPick}
            />
          ))}
        </ol>
      )}
      <SelectField
        label="Add a supplier"
        selectWrapClassName="w-full"
        value=""
        disabled={addLock.disabled || status !== 'ready' || addable.length === 0}
        title={addLock.disabled ? addLock.title : undefined}
        options={[
          { value: '', label: menuLabel },
          ...addable.map((supplier) => ({ value: supplier.id, label: supplier.name })),
        ]}
        onChange={(event) => {
          const supplier = suppliers.find((candidate) => String(candidate.id) === event.target.value);
          if (supplier) onAdd(supplier);
        }}
      />
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-crit-fg" role="alert">
          <span>Could not load the supplier list.</span>
          <Button size="sm" onClick={onRetrySuppliers}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

// SecondaryConnections: the second section of the API Connection part: the suppliers that take the orders over, in order, with the buttons
// that move them up or down or take them out, and the menu that adds one.
import { Button, DataTable, Icon, SelectField, type DataTableColumn } from '@/components/ui';
import type { SuppliersStatus } from '../../hooks/useSuppliers';
import { roleLabel, type DraftStep, type EditLock } from '../../lib/links';
import type { SupplierService } from '../../types';
import { LinkServicePicker } from '../LinkServicePicker';
import { addableSuppliers, secondaryOptions } from './connectionChoices';
import type { SupplierRef } from './useConnectionDraft';

/** One secondary connection with its place in the whole draft (the primary connection is place 0). */
type Row = { step: DraftStep; index: number };

export interface SecondaryConnectionsProps {
  /** The whole draft in order; the steps after the first are the secondary connections. */
  steps: readonly DraftStep[];
  suppliers: readonly SupplierRef[];
  suppliersStatus: SuppliersStatus;
  /** For moving, removing and picking: the staff member needs `catalog:update`. */
  lock: EditLock;
  /** For the menu that adds a supplier, which also reads the supplier list: `catalog:update` and `suppliers:read`. */
  addLock: EditLock;
  onAdd: (supplier: SupplierRef) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onPick: (key: string, item: SupplierService) => void;
}

// The buttons of one row. The first secondary connection may move up into the primary place: that is how one is made the primary.
function RowButtons({
  row,
  count,
  lock,
  onMove,
  onRemove,
}: { row: Row; count: number; lock: EditLock } & Pick<SecondaryConnectionsProps, 'onMove' | 'onRemove'>) {
  const title = lock.disabled ? lock.title : undefined;
  // The first secondary connection moves into the primary place, which is worth saying: the button reads as an ordinary "up".
  const upTitle = title ?? (row.index === 1 ? 'Make this the primary connection' : undefined);
  const name = row.step.supplierName;
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        icon
        aria-label={`Move ${name} up`}
        disabled={lock.disabled}
        title={upTitle}
        onClick={() => onMove(row.index, row.index - 1)}
      >
        <Icon name="arrowUp" className="ic-sm" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon
        aria-label={`Move ${name} down`}
        disabled={lock.disabled || row.index === count - 1}
        title={title}
        onClick={() => onMove(row.index, row.index + 1)}
      >
        <Icon name="arrowDown" className="ic-sm" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon
        aria-label={`Remove ${name}`}
        disabled={lock.disabled}
        title={title}
        onClick={() => onRemove(row.index)}
      >
        <Icon name="x" className="ic-sm" />
      </Button>
    </span>
  );
}

/**
 * Nothing is saved here: moving, removing and adding change the draft, and the pinned Save sends the whole chain. A supplier just added
 * has no service yet, so its row shows the search of that supplier's own services.
 */
export function SecondaryConnections({
  steps,
  suppliers,
  suppliersStatus,
  lock,
  addLock,
  onAdd,
  onMove,
  onRemove,
  onPick,
}: SecondaryConnectionsProps) {
  const rows: Row[] = steps.slice(1).map((step, offset) => ({ step, index: offset + 1 }));
  const status = addLock.disabled ? 'ready' : suppliersStatus;
  const addable = addableSuppliers(suppliers, steps);
  const noPrimary = steps.length === 0;
  const firstLine =
    status === 'loading'
      ? 'Loading suppliers…'
      : status === 'error'
        ? 'Supplier list unavailable'
        : addable.length === 0 && !addLock.disabled
          ? 'No other supplier'
          : 'Choose a supplier…';
  const columns: DataTableColumn<Row>[] = [
    { key: 'role', label: 'Role', render: (row) => roleLabel(row.index + 1) },
    { key: 'api', label: 'API', render: (row) => row.step.supplierName },
    {
      key: 'service',
      label: 'API service',
      render: (row) =>
        row.step.supplierServiceId === null ? (
          <LinkServicePicker step={row.step} lock={lock} onPick={(item) => onPick(row.step.key, item)} />
        ) : (
          row.step.supplierServiceName
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'whitespace-nowrap',
      render: (row) => (
        <RowButtons row={row} count={steps.length} lock={lock} onMove={onMove} onRemove={onRemove} />
      ),
    },
  ];

  return (
    <>
      <p className="hint mb-2">
        They take over, in this order, when the primary connection is disabled or fails.
      </p>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-ink3">No secondary connection.</p>
      ) : (
        <DataTable
          skin="list"
          footer={false}
          caption="Secondary API connections"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.step.key}
        />
      )}
      <SelectField
        layout="row"
        label="Add a secondary API"
        selectWrapClassName="w-full max-w-md"
        value=""
        disabled={addLock.disabled || status !== 'ready' || addable.length === 0 || noPrimary}
        title={addLock.disabled ? addLock.title : noPrimary ? 'Choose the primary API first' : undefined}
        options={secondaryOptions(addable, firstLine)}
        onChange={(event) => {
          const supplier = addable.find((candidate) => String(candidate.id) === event.target.value);
          if (supplier) onAdd(supplier);
        }}
      />
    </>
  );
}

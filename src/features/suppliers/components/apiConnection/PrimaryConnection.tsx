// PrimaryConnection: the first section of the API Connection part: the supplier that gets the service's orders first, and the service at
// that supplier it orders from. Label-left rows, as in the layout the owner asked for.
import { useState } from 'react';
import { Button, FormRow, SelectField, ReadValue } from '@/components/ui';
import type { SuppliersStatus } from '../../hooks/useSuppliers';
import type { DraftStep, EditLock } from '../../lib/links';
import type { SupplierService } from '../../types';
import { LinkServicePicker } from '../LinkServicePicker';
import { primaryOptions } from './connectionChoices';
import type { SupplierRef } from './useConnectionDraft';

export interface PrimaryConnectionProps {
  /** The whole draft in order; its first step is the primary connection. */
  steps: readonly DraftStep[];
  /** The suppliers the menu may offer. */
  suppliers: readonly SupplierRef[];
  /** Where the supplier list is: the menu says so while it is read or when it failed. */
  suppliersStatus: SuppliersStatus;
  /** For choosing the service: the staff member needs `catalog:update`. */
  lock: EditLock;
  /** For the supplier menu, which also reads the supplier list: `catalog:update` and `suppliers:read`. */
  addLock: EditLock;
  /** A supplier was chosen for the primary place, or `null` for none. */
  onChoose: (supplier: SupplierRef | null) => void;
  onPick: (key: string, item: SupplierService) => void;
}

const NO_LINK = 'No supplier is linked. Orders for this service wait for manual dispatch.';

/**
 * Choosing another supplier clears the service (it belongs to the old supplier), so the search for the new supplier's services opens.
 * A supplier whose service is chosen shows its name with Change beside it.
 */
export function PrimaryConnection({
  steps,
  suppliers,
  suppliersStatus,
  lock,
  addLock,
  onChoose,
  onPick,
}: PrimaryConnectionProps) {
  // The step whose service is being changed; a step that took the primary place meanwhile is not the one the person chose.
  const [changingKey, setChangingKey] = useState<string | null>(null);
  const primary = steps[0] ?? null;
  const changing = primary !== null && changingKey === primary.key;
  // A menu that is off for the permission is not "loading" or "failed": the list was never asked for.
  const status = addLock.disabled ? 'ready' : suppliersStatus;
  const menuHint =
    status === 'loading'
      ? 'Loading suppliers…'
      : status === 'error'
        ? 'Supplier list unavailable.'
        : primary === null
          ? NO_LINK
          : 'The supplier that gets the orders of this service first.';
  const pickingService = primary !== null && (primary.supplierServiceId === null || changing);

  return (
    <>
      <SelectField
        layout="row"
        label="API"
        selectWrapClassName="w-full max-w-md"
        value={primary?.supplierId ?? ''}
        options={primaryOptions(suppliers, steps)}
        disabled={addLock.disabled || status !== 'ready'}
        title={addLock.disabled ? addLock.title : undefined}
        hint={menuHint}
        onChange={(event) => {
          setChangingKey(null);
          const chosen = suppliers.find((candidate) => String(candidate.id) === event.target.value);
          if (event.target.value === '') onChoose(null);
          else if (chosen && chosen.id !== primary?.supplierId) onChoose(chosen);
        }}
      />
      <FormRow label="API service" hint="The service at the supplier that this service orders from.">
        {primary === null ? (
          <ReadValue muted>Choose an API first.</ReadValue>
        ) : pickingService ? (
          <div className="max-w-md">
            <LinkServicePicker
              step={primary}
              lock={lock}
              onPick={(item) => {
                setChangingKey(null);
                onPick(primary.key, item);
              }}
            />
            {changing && (
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => setChangingKey(null)}>
                Keep {primary.supplierServiceName}
              </Button>
            )}
          </div>
        ) : (
          <ReadValue className="flex-wrap gap-x-3">
            <span>{primary.supplierServiceName}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={lock.disabled}
              title={lock.disabled ? lock.title : undefined}
              onClick={() => setChangingKey(primary.key)}
            >
              Change
            </Button>
          </ReadValue>
        )}
      </FormRow>
    </>
  );
}

// The list of connected suppliers in step 1 of the Add services flow: one radio each with the supplier's name, its state and its API type.
// A disabled supplier is listed but cannot be chosen, and its line says what to do.
import { useId } from 'react';
import { RadioGroup, type RadioOption } from '@/components/ui';
import type { Id } from '@/lib/api';
import { driverLabel } from '../../lib/connection';
import type { Supplier } from '../../types';
import { SupplierStatusBadge } from '../SupplierStatusBadge';
import { supplierBlock } from './addFlowChoice';

/** The suppliers to list, the one that is marked and what to do when another is picked. */
export interface SupplierChoiceListProps {
  suppliers: readonly Supplier[];
  /** The supplier that is marked, or `null` when none is. */
  markedId: Id | null;
  onMark: (id: Id) => void;
}

/** One supplier as a radio option: name and state badge on the first line, the API type (or why it cannot be chosen) under it. */
function optionOf(supplier: Supplier): RadioOption {
  const block = supplierBlock(supplier);
  return {
    value: String(supplier.id),
    label: (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        {supplier.name}
        <SupplierStatusBadge supplier={supplier} />
      </span>
    ),
    description: block ?? driverLabel(supplier.driver),
    disabled: block !== undefined,
  };
}

/** The suppliers as a group of radios. A long list scrolls inside its own box, so the two ways in stay in view. */
export function SupplierChoiceList({ suppliers, markedId, onMark }: SupplierChoiceListProps) {
  const name = useId();
  return (
    <RadioGroup
      legend="Supplier"
      name={name}
      options={suppliers.map(optionOf)}
      value={markedId === null ? '' : String(markedId)}
      onChange={(event) => onMark(Number(event.target.value))}
      highlight
      listClassName="max-h-64 space-y-2 overflow-y-auto"
    />
  );
}

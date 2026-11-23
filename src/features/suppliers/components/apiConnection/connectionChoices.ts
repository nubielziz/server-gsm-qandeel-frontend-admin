// The options of the two supplier menus of the API Connection part: pure helpers, so the rules about who is offered are tested alone.
import type { SelectOption } from '@/components/ui';
import type { DraftStep } from '../../lib/links';
import type { SupplierRef } from './useConnectionDraft';

/** The word of the empty choice of the primary menu. */
export const NONE_LABEL = '- None -';

/**
 * What the primary menu offers: "- None -" (not while a secondary connection exists), the supplier that is the primary now (taken from
 * the draft, so it is there even when the supplier list is not), and every supplier the secondary connections do not use. The server
 * decides whether a disabled supplier may be linked.
 */
export function primaryOptions(
  suppliers: readonly SupplierRef[],
  steps: readonly DraftStep[],
): SelectOption[] {
  const [primary, ...secondary] = steps;
  const used = new Set(secondary.map((step) => step.supplierId));
  return [
    { value: '', label: NONE_LABEL, disabled: secondary.length > 0 },
    ...(primary ? [{ value: primary.supplierId, label: primary.supplierName }] : []),
    ...suppliers
      .filter((supplier) => supplier.id !== primary?.supplierId && !used.has(supplier.id))
      .map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];
}

/** The suppliers a secondary connection can still be added for: every one that is not in the chain yet (one place per supplier). */
export function addableSuppliers(
  suppliers: readonly SupplierRef[],
  steps: readonly DraftStep[],
): SupplierRef[] {
  const inChain = new Set(steps.map((step) => step.supplierId));
  return suppliers.filter((supplier) => !inChain.has(supplier.id));
}

/** The secondary menu: its first line (a prompt or the reason there is nothing to choose), then the suppliers it can add. */
export function secondaryOptions(addable: readonly SupplierRef[], firstLine: string): SelectOption[] {
  return [
    { value: '', label: firstLine },
    ...addable.map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];
}

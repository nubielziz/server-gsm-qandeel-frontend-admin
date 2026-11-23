// The "Add services" dialog of the Catalog page: step 1 ("Where from") lives here, steps 2 and 3 belong to the path dialog the host passes in
// (whole groups, or single services). Opened from the Catalog header, or by an address that names a supplier and a way.
import type { ComponentType } from 'react';
import type { Id } from '@/lib/api';
import { useSupplierGrants } from '../../hooks/useSupplierGrants';
import { useSuppliers } from '../../hooks/useSuppliers';
import { SUPPLIERS_READ, type AddFlowFrom } from './addFlowChoice';
import type { AddFlowPathProps } from './types';
import { useAddFlowChoice } from './useAddFlowChoice';
import { WhereFromStep } from './WhereFromStep';

/** What the host gives the flow: whether it is open, where to start, the two path dialogs, and what to do on a close, a done and a service of my own. */
export interface AddServicesDialogProps {
  open: boolean;
  /** A supplier (and a way) to start from: with both, the path opens at once once the supplier is loaded; with a supplier only, it is marked. */
  initial?: { supplierId?: Id; from?: AddFlowFrom };
  /** The two path dialogs. Each one takes over after step 1 and is mounted with `key={supplier.id}`. */
  paths: { groups: ComponentType<AddFlowPathProps>; singles: ComponentType<AddFlowPathProps> };
  /** "A service of my own". The host closes the flow (sets `open` to false) and opens the New service form. */
  onOwnService: () => void;
  onClose: () => void;
  /** Passed on to the path: called once when services were added, so the page behind can refresh. */
  onDone?: () => void;
}

/** The flow while it is open. It is mounted fresh on every opening, so nothing from an earlier visit is left in its state. */
function AddServicesFlow({
  initial,
  paths,
  onOwnService,
  onClose,
  onDone,
}: Omit<AddServicesDialogProps, 'open'>) {
  const grants = useSupplierGrants();
  const list = useSuppliers({ enabled: grants.can(SUPPLIERS_READ) });
  const choice = useAddFlowChoice(initial, list.suppliers, list.query.isSuccess);

  if (choice.chosen) {
    const Path = choice.chosen.from === 'groups' ? paths.groups : paths.singles;
    return (
      <Path
        key={choice.chosen.supplier.id}
        supplier={choice.chosen.supplier}
        onBack={choice.back}
        onClose={onClose}
        onDone={onDone}
      />
    );
  }
  return (
    <WhereFromStep
      grants={grants}
      list={list}
      marked={choice.marked}
      notice={choice.notice}
      onMark={choice.mark}
      onPick={choice.pick}
      onOwnService={onOwnService}
      onClose={onClose}
    />
  );
}

/**
 * The Add services flow. While no path is chosen it shows step 1 in a Modal; once a supplier and a way are chosen its own Modal goes and
 * the path dialog for that way takes over (steps 2 and 3, with its own buttons). Back from a path returns to step 1 with the supplier
 * still marked. The suppliers come from the existing list hook; the flow calls no endpoint of its own.
 * @param props see {@link AddServicesDialogProps}
 */
export function AddServicesDialog({ open, ...flow }: AddServicesDialogProps) {
  return open ? <AddServicesFlow {...flow} /> : null;
}

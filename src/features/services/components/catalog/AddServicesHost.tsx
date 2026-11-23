// AddServicesHost: shows the Add services dialog while the Catalog address asks for it (`?add=<supplier id>|new`, `from=groups|services`)
// and clears both keys when it closes. The dialog is built in the suppliers feature and arrives as a prop, so the Catalog page decides
// what to render; "A service of my own" closes the flow and opens the existing New service form.
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { Id } from '@/lib/api';
import { useAddServicesAddress } from '../../hooks/useAddServicesAddress';
import { useCatalogRefresh } from '../../hooks/useCatalogRefresh';
import { useServiceGrants } from '../../hooks/useServiceGrants';
import { ADD_SERVICES_PERMISSION, type AddFrom } from '../../lib/addAddress';
import { OwnServiceDialog } from './OwnServiceDialog';

/** What the Add services dialog is given: the same props whatever component the page passes. */
export type AddServicesDialogProps = {
  open: boolean;
  /** The supplier (and the way in) the address named; left out when the flow starts on its first step. */
  initial?: { supplierId?: number; from?: AddFrom };
  /** The staff member chose "A service of my own": the dialog is done, the New service form opens next. */
  onOwnService: () => void;
  onClose: () => void;
  /** Called when services were added, so the table behind can refresh. */
  onDone?: () => void;
};

/** The component type of the Add services dialog. */
export type AddServicesDialogComponent = ComponentType<AddServicesDialogProps>;

export interface AddServicesHostProps {
  /** The Add services dialog. */
  Dialog: AddServicesDialogComponent;
  /** Told the id of a service made through "A service of my own", in place of the move to its panel (see OwnServiceDialog). */
  onOwnServiceCreated?: (id: Id) => void;
}

/**
 * Mounts the dialog only while the address names it, so every opening starts on its first step. A role without `catalog:create` never
 * gets it: an address that asks for it is cleaned instead (the server would refuse every step anyway).
 */
export function AddServicesHost({ Dialog, onOwnServiceCreated }: AddServicesHostProps) {
  const grants = useServiceGrants();
  const refresh = useCatalogRefresh();
  const { add, close } = useAddServicesAddress();
  const [ownService, setOwnService] = useState(false);
  const allowed = grants.can(ADD_SERVICES_PERMISSION);
  const requested = add !== null;

  useEffect(() => {
    if (requested && grants.ready && !allowed) close();
  }, [requested, grants.ready, allowed, close]);

  const initial = useMemo(
    () => (add && add.add !== 'new' ? { supplierId: add.add, from: add.from } : undefined),
    [add],
  );

  return (
    <>
      {add && allowed && (
        <Dialog
          key={`${add.add}:${add.from ?? ''}`}
          open
          initial={initial}
          onOwnService={() => {
            setOwnService(true);
            close();
          }}
          onClose={close}
          onDone={() => void refresh()}
        />
      )}
      {ownService && (
        <OwnServiceDialog onClose={() => setOwnService(false)} onCreated={onOwnServiceCreated} />
      )}
    </>
  );
}

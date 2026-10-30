// SupplierDialogs: shows the dialog the page asked for (`SupplierDialogState`) and wires what happens after it: a supplier just
// connected is selected and the toast offers "Test connection"; a deleted supplier is no longer selected. One dialog at a time.
import { toast } from '@/components/ui';
import { useTestSupplier } from '../hooks/useSupplierMutations';
import type { Supplier, SupplierDetail } from '../types';
import { ConnectDialog } from './ConnectDialog';
import { DeleteDialog } from './DeleteDialog';
import { DisableDialog } from './DisableDialog';
import { EditConnectionDialog } from './EditConnectionDialog';
import { ImportDialog } from './ImportDialog';
import { LinksDialog } from './LinksDialog';
import { RerouteDialog } from './RerouteDialog';
import type { SupplierDialogState } from './supplierDialogState';

export interface SupplierDialogsProps {
  dialog: SupplierDialogState | null;
  onChange: (dialog: SupplierDialogState | null) => void;
  /** Selects a supplier on the page (`null` clears the selection, so the first supplier shows). */
  onSelect: (id: number | null) => void;
  /** Whether the "Test connection" button is offered after connecting (the staff member can update suppliers). */
  canTest: boolean;
}

/** Renders the open dialog and runs what follows it (select the new supplier and offer a test; clear a deleted one). */
export function SupplierDialogs({ dialog, onChange, onSelect, canTest }: SupplierDialogsProps) {
  const test = useTestSupplier();
  if (!dialog) return null;
  const close = () => onChange(null);

  switch (dialog.kind) {
    case 'connect':
      return (
        <ConnectDialog
          onClose={close}
          onConnected={(supplier: SupplierDetail) => {
            close();
            onSelect(supplier.id);
            toast({
              kind: 'success',
              title: `${supplier.name} connected`,
              body: 'Test the connection to make sure the key works.',
              action: canTest ? { label: 'Test connection', run: () => test.mutate(supplier) } : undefined,
              ttl: 12_000,
            });
          }}
        />
      );
    case 'edit':
      return <EditConnectionDialog supplier={dialog.supplier} onClose={close} />;
    case 'disable':
      return <DisableDialog supplier={dialog.supplier} links={dialog.links} onClose={close} />;
    case 'delete':
      return (
        <DeleteDialog
          supplier={dialog.supplier}
          onClose={close}
          onDeleted={(_supplier: Supplier) => onSelect(null)}
        />
      );
    case 'import':
      return <ImportDialog supplier={dialog.supplier} onClose={close} />;
    case 'links':
      return <LinksDialog link={dialog.link} onClose={close} />;
    case 'reroute':
      return <RerouteDialog supplier={dialog.supplier} onClose={close} />;
  }
}

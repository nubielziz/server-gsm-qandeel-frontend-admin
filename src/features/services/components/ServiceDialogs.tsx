// ServiceDialogs: mounts the dialog the page asked for (`ServiceDialogState`), so the header's actions and the row menus open
// dialogs the same way. Each dialog owns its form and its request; this only picks one. The shop page and shop price dialogs are the
// storefront's: they read the listing by its id first.
import type { RowSelection } from '@/components/ui';
import { ListingEditDialogById, PriceDialogById } from '@/features/storefront';
import { BulkPriceDialog } from './BulkPriceDialog';
import { DeleteServiceDialog } from './DeleteServiceDialog';
import { EditPriceDialog } from './EditPriceDialog';
import { FieldsDialog } from './FieldsDialog';
import { GroupPricesDialog } from './GroupPricesDialog';
import type { Service } from '../types';
import { OptionsDialog } from './OptionsDialog';
import { ServiceFormDialog } from './ServiceFormDialog';
import type { ServiceDialogState } from './serviceDialogState';

export interface ServiceDialogsProps {
  dialog: ServiceDialogState | null;
  selection: RowSelection<number>;
  onClose: () => void;
  /** Called after a service was deleted (its row is unticked first), so the page can drop whatever showed it. */
  onDeleted?: (service: Service) => void;
}

/** Mounts the dialog the page asked for. */
export function ServiceDialogs({ dialog, selection, onClose, onDeleted }: ServiceDialogsProps) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'bulk':
      return (
        <BulkPriceDialog
          selectedIds={[...selection.selected]}
          onClose={onClose}
          onApplied={selection.clear}
        />
      );
    case 'edit':
      return <ServiceFormDialog service={dialog.service} onClose={onClose} />;
    case 'price':
      return <EditPriceDialog service={dialog.service} onClose={onClose} />;
    case 'groups':
      return <GroupPricesDialog service={dialog.service} onClose={onClose} />;
    case 'fields':
      return <FieldsDialog service={dialog.service} onClose={onClose} />;
    case 'options':
      return <OptionsDialog service={dialog.service} onClose={onClose} />;
    case 'shop-page':
      return dialog.service.listingId == null ? null : (
        <ListingEditDialogById
          listingId={dialog.service.listingId}
          name={dialog.service.name}
          onClose={onClose}
        />
      );
    case 'shop-price':
      return dialog.service.listingId == null ? null : (
        <PriceDialogById listingId={dialog.service.listingId} name={dialog.service.name} onClose={onClose} />
      );
    case 'delete':
      return (
        <DeleteServiceDialog
          service={dialog.service}
          onClose={onClose}
          onDeleted={(service) => {
            selection.toggle(service.id, false);
            onDeleted?.(service);
          }}
        />
      );
  }
}

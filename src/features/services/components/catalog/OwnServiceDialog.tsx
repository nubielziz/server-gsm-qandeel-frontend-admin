// OwnServiceDialog: "A service of my own", the one path of the Add services flow that does not come from a supplier. It is the existing
// New service form; when the form creates the service, the Catalog opens the side panel on it, so the next steps (prices, the order
// form, a supplier) are one click away.
import { useNavigate } from 'react-router';
import type { Id } from '@/lib/api';
import { catalogPath } from '../../lib/paths';
import { ServiceFormDialog } from '../ServiceFormDialog';

export interface OwnServiceDialogProps {
  /** Asked for when the form is cancelled or has saved. */
  onClose: () => void;
  /**
   * Told the new service's id after the save, in place of the move to its panel. The Catalog page gives it so that the move can ask
   * about unsaved changes in the panel that is open; without it the dialog moves the address itself.
   */
  onCreated?: (id: Id) => void;
}

/** The New service form that ends on the new service's panel (`/catalog?open=<id>`). */
export function OwnServiceDialog({ onClose, onCreated }: OwnServiceDialogProps) {
  const navigate = useNavigate();
  return (
    <ServiceFormDialog
      onClose={onClose}
      onSaved={(service) => {
        if (onCreated) onCreated(service.id);
        else void navigate(catalogPath({ open: service.id }));
      }}
    />
  );
}

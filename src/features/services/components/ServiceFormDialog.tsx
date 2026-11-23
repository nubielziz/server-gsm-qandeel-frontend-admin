// ServiceFormDialog: "New service" and "Edit service" (`POST` and `PATCH /admin/services`) in a dialog. The fields are ServiceDetailsBody,
// the same body the panel's Details section uses. An edit also shows the linked suppliers read-only, with a link to the Suppliers page.
import { FormDialog } from '@/components/ui';
import { useServiceDetailsForm } from '../hooks/useServiceDetailsForm';
import type { Service } from '../types';
import { LinkedSuppliers } from './LinkedSuppliers';
import { ServiceDetailsBody } from './ServiceDetailsBody';

export interface ServiceFormDialogProps {
  /** The service to edit; leave out to create one. */
  service?: Service;
  onClose: () => void;
  /**
   * Called with the service the server answered with, after a save and before the dialog closes (a host may open its panel). Opened
   * without a service, the dialog only creates, so this is then the new service.
   */
  onSaved?: (saved: Service) => void;
}

/** Creates a service, or edits the one it is given. A refusal from the server shows under its field, or in the dialog's error slot. */
export function ServiceFormDialog({ service, onClose, onSaved }: ServiceFormDialogProps) {
  const { form, submit } = useServiceDetailsForm(service, onSaved);
  return (
    <FormDialog
      open
      title={service ? 'Edit service' : 'New service'}
      sub={service ? service.name : 'Add the service to the catalog, then link it to a supplier.'}
      confirm={service ? 'Save changes' : 'Create service'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <ServiceDetailsBody form={form} service={service} autoFocus />
        {service && <LinkedSuppliers service={service} />}
      </div>
    </FormDialog>
  );
}

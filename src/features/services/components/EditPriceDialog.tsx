// EditPriceDialog: "Edit price" for one service (`PATCH /admin/services/:id`). Ports editPrice of 43-p-services.js. The console does no
// pricing maths (MISMATCHES M92): the floor is the server's and a refused price shows under the field. The fields are EditPriceBody, shared with the panel.
import { FormDialog } from '@/components/ui';
import { useEditPriceForm } from '../hooks/useEditPriceForm';
import type { Service } from '../types';
import { EditPriceBody } from './EditPriceBody';

export interface EditPriceDialogProps {
  service: Service;
  onClose: () => void;
}

/** The dialog frame around the form and its request; a refused price shows under the field. */
export function EditPriceDialog({ service, onClose }: EditPriceDialogProps) {
  const { form, submit } = useEditPriceForm(service);
  return (
    <FormDialog
      open
      title="Edit price"
      sub={
        <>
          {service.name} <span className="mono text-ink3">{service.code}</span>
        </>
      }
      confirm="Save price"
      onClose={onClose}
      onSubmit={submit}
    >
      <EditPriceBody service={service} form={form} autoFocus />
    </FormDialog>
  );
}

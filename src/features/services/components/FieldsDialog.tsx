// FieldsDialog: "Fields" for one service (`PUT /admin/services/:id/fields`): the custom fields a buyer fills in. It opens the form
// only once the service's saved fields are loaded, because saving replaces the whole list and must not start from nothing.
import { useServiceDetail } from '../hooks/useServiceDetail';
import type { Service } from '../types';
import { FieldsForm } from './FieldsForm';
import { LoadGate } from './LoadGate';

/** Waits for the saved fields, then opens the form. */
export function FieldsDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const { detail, query } = useServiceDetail(service.id);
  return (
    <LoadGate
      ready={Boolean(detail)}
      queries={[query]}
      title="Fields"
      sub={service.name}
      errorTitle="Could not load the fields"
      onClose={onClose}
    >
      {detail && <FieldsForm service={service} saved={detail.fields} onClose={onClose} />}
    </LoadGate>
  );
}

// OptionsDialog: "Options" for one service (`PUT /admin/services/:id/options`): the model, network and MEP lists. It opens the form
// only once the service's saved options are loaded, because saving replaces the lists and must not start from nothing.
import { useServiceDetail } from '../hooks/useServiceDetail';
import type { Service } from '../types';
import { LoadGate } from './LoadGate';
import { OptionsForm } from './OptionsForm';

/** Waits for the saved options, then opens the form. */
export function OptionsDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const { detail, query } = useServiceDetail(service.id);
  return (
    <LoadGate
      ready={Boolean(detail)}
      queries={[query]}
      title="Options"
      sub={service.name}
      errorTitle="Could not load the options"
      onClose={onClose}
    >
      {detail && <OptionsForm service={service} saved={detail.options} onClose={onClose} />}
    </LoadGate>
  );
}

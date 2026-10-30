// GroupPricesDialog: "Group prices" for one service (`PUT /admin/services/:id/group-prices`): one fixed price per merchant group.
// A group left blank pays the base price less its discount. It opens the form only once the service's saved prices and the
// merchant groups are loaded, because saving replaces the whole list and must not start from nothing.
import { useGroupOptions } from '../hooks/useChoices';
import { useServiceDetail } from '../hooks/useServiceDetail';
import type { Service } from '../types';
import { GroupPricesForm } from './GroupPricesForm';
import { LoadGate } from './LoadGate';

/** Waits for the saved prices and the groups, then opens the form. */
export function GroupPricesDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const { detail, query } = useServiceDetail(service.id);
  const groups = useGroupOptions();
  return (
    <LoadGate
      ready={Boolean(detail && groups.data)}
      queries={[query, groups]}
      title="Group prices"
      sub={service.name}
      errorTitle="Could not load the group prices"
      onClose={onClose}
    >
      {detail && groups.data && (
        <GroupPricesForm
          service={service}
          groups={groups.data}
          saved={detail.groupPrices}
          onClose={onClose}
        />
      )}
    </LoadGate>
  );
}

// The services the Add listing dialog chooses from: the active IMEI services by name (the storefront sells only those). It uses
// the services feature's own `listServices`, so this feature keeps no lookup of that route. Needs `catalog:read`.
import { listServices } from '@/features/services';
import { useApiQuery } from '@/lib/query';
import { PICKER_CAP, PICKER_STALE_MS, SERVICE_PICKER_KEY } from './keys';

/** The services by name. Pass `enabled: false` when the staff member lacks `catalog:read`. */
export function useServiceChoices(enabled = true) {
  return useApiQuery({
    queryKey: [...SERVICE_PICKER_KEY],
    queryFn: ({ signal }) =>
      listServices(
        {
          start: 0,
          end: PICKER_CAP,
          sort: ['name'],
          order: ['asc'],
          filters: { type: 'imei', status: 'active' },
        },
        { signal },
      ),
    select: (result) => result.data,
    enabled,
    staleTime: PICKER_STALE_MS,
  });
}

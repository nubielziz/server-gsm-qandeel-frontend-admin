// The Enabled checkbox of the grid (the "Display Enable/Disable Service" column): a service is switched on or off at once, with the toast
// the other switches show. Side effects: `PATCH /admin/services/:id` with `status`, and the refresh of the services reads (the grid read again).
import type { Id } from '@/lib/api';
import { useApiMutation } from '@/lib/query';
import { updateService } from '../api';
import { STATUS_TOAST } from '../lib/status';
import type { ServiceStatus } from '../types';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

/** The service to switch (its id and name, for the toast) and the status to give it. */
export type GridStatusChange = { id: Id; name: string; status: ServiceStatus };

/** Enables or disables one service of the grid. A refusal shows the server's words in the default error toast. */
export function useSetGridStatus() {
  return useApiMutation({
    mutationFn: ({ id, status }: GridStatusChange) => updateService(id, { status }),
    invalidates: (_result, { id }) => staleServices(id),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (_result, { name, status }) => ({
      message: `${name} ${STATUS_TOAST[status].title}`,
      description: STATUS_TOAST[status].body,
    }),
  });
}

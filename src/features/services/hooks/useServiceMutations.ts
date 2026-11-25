// The actions on one service, each with the toast the demo showed and the reads it makes stale. Ports the toasts of `svc-on` and
// `editPrice` in 43-p-services.js (a new service is made by the +Add Service view's own hook). The switches leave a failed call to the default error toast (the server's
// words); the hooks used from a dialog leave it to that dialog, which shows it in its error slot.
import { toast } from '@/components/ui';
import { money, pct } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import { deleteService, updateService } from '../api';
import { STATUS_TOAST } from '../lib/status';
import type { Service, ServiceStatus, UpdateServiceBody } from '../types';
import { SERVICE_STALE_KEYS, staleServices, staleServicesAndCategories } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** A service with the body to send for it. */
type WithBody<B> = { service: Service; body: B };

/** The Enabled switch: merchants can order an active service again, or stop seeing a disabled one. */
export function useSetServiceStatus() {
  return useApiMutation({
    mutationFn: ({ service, status }: { service: Service; status: ServiceStatus }) =>
      updateService(service.id, { status }),
    invalidates: (_result, { service }) => staleServices(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    onSuccess: (_result, { service, status }) => {
      toast({
        kind: 'success',
        title: `${service.name} ${STATUS_TOAST[status].title}`,
        body: STATUS_TOAST[status].body,
        ttl: 3200,
      });
    },
  });
}

/**
 * Saves a new base price, minimum profit and/or own cost. The toast reports the floor and the margin the server worked out, because
 * the console does not (the demo showed them from its own maths). A save of the own cost alone says the cost used, not a price.
 */
export function useUpdatePrice() {
  return useApiMutation({
    mutationFn: ({ service, body }: WithBody<UpdateServiceBody>) => updateService(service.id, body),
    invalidates: (_result, { service }) => staleServices(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    onSuccess: (updated, { service, body }) => {
      // The cost changes the floor and the margin, not the price: a save that holds nothing but the own cost is not a price update.
      const costOnly = !('basePrice' in body) && !('minProfit' in body);
      toast({
        kind: 'success',
        title: costOnly ? 'Cost updated' : 'Price updated',
        body:
          (costOnly
            ? `${service.name} now uses a cost of ${money(updated.cost)}. `
            : `${service.name} is now ${money(updated.basePrice)}. `) +
          `Floor ${money(updated.floorPrice)}, ` +
          `margin ${pct(updated.marginPct, 1)}. ` +
          (updated.belowFloor
            ? 'It is still under the floor, so orders are charged the floor price.'
            : 'New orders use it.'),
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the name, code, category, type or SLA of a service. The dialog shows a refusal. */
export function useUpdateService() {
  return useApiMutation({
    mutationFn: ({ service, body }: WithBody<UpdateServiceBody>) => updateService(service.id, body),
    invalidates: (_result, { service }) => staleServicesAndCategories(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (updated) => ({ message: `${updated.name} updated` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a service. The dialog shows the server's refusal. */
export function useDeleteService() {
  return useApiMutation({
    mutationFn: (service: Service) => deleteService(service.id),
    invalidates: (_result, service) => staleServicesAndCategories(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (_result, service) => ({ message: `${service.name} deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

// The actions on one service, each with the toast the demo showed and the reads it makes stale. Ports the toasts of `svc-on`,
// `svc-auto` and `editPrice` in 43-p-services.js. The switches leave a failed call to the default error toast (the server's
// words); the hooks used from a dialog leave it to that dialog, which shows it in its error slot.
import { toast } from '@/components/ui';
import { money, pct } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import { createService, deleteService, updateService } from '../api';
import { MODE_TOAST, STATUS_TOAST } from '../lib/status';
import type { CreateServiceBody, ExecutionMode, Service, ServiceStatus, UpdateServiceBody } from '../types';
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

/** The Auto switch: new orders go to the supplier at once (`auto`) or wait for an operator (`manual`). */
export function useSetExecutionMode() {
  return useApiMutation({
    mutationFn: ({ service, mode }: { service: Service; mode: ExecutionMode }) =>
      updateService(service.id, { executionMode: mode }),
    invalidates: (_result, { service }) => staleServices(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    onSuccess: (_result, { service, mode }) => {
      toast({
        kind: 'info',
        title: `Automation ${MODE_TOAST[mode].title} for ${service.name}`,
        body: MODE_TOAST[mode].body,
        ttl: 3200,
      });
    },
  });
}

/**
 * Saves a new base price and/or minimum profit. The toast reports the floor and the margin the server worked out, because
 * the console does not (the demo showed them from its own maths).
 */
export function useUpdatePrice() {
  return useApiMutation({
    mutationFn: ({ service, body }: WithBody<UpdateServiceBody>) => updateService(service.id, body),
    invalidates: (_result, { service }) => staleServices(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    onSuccess: (updated, { service }) => {
      toast({
        kind: 'success',
        title: 'Price updated',
        body:
          `${service.name} is now ${money(updated.basePrice)}. Floor ${money(updated.floorPrice)}, ` +
          `margin ${pct(updated.marginPct, 1)}. ` +
          (updated.belowFloor
            ? 'It is still under the floor, so orders are charged the floor price.'
            : 'New orders use it.'),
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Creates a service. The dialog shows a refusal (for example a code that is taken). */
export function useCreateService() {
  return useApiMutation({
    mutationFn: (body: CreateServiceBody) => createService(body),
    invalidates: staleServicesAndCategories(),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (service) => ({
      message: `${service.name} created`,
      description: 'Link it to a supplier on the Suppliers page so orders can be sent.',
    }),
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

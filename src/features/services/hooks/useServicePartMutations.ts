// Saving the parts of a service that are replaced as a whole list: group prices and custom fields. A save makes
// the service's own record stale (the edit view's parts read it) and, for group prices, the price resolutions and the listing read (the shop
// price block prints the shop floor and the B2B price, and keeps its copy until a write). The part that saves shows the refusal.
import { useApiMutation } from '@/lib/query';
import { replaceServiceFields, replaceServiceGroupPrices } from '../api';
import type { ReplaceFieldsBody, ReplaceGroupPricesBody, Service } from '../types';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

const NO_ERROR_TOAST = () => false as const;

type ForService<B> = { service: Service; body: B };

/** Saves the fixed price of a service for each rank. */
export function useReplaceGroupPrices() {
  return useApiMutation({
    mutationFn: ({ service, body }: ForService<ReplaceGroupPricesBody>) =>
      replaceServiceGroupPrices(service.id, body),
    invalidates: (_result, { service }) => staleServices(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (_result, { service }) => ({
      message: 'Group prices saved',
      description: `${service.name}: new orders use them.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the custom fields of a service. */
export function useReplaceFields() {
  return useApiMutation({
    mutationFn: ({ service, body }: ForService<ReplaceFieldsBody>) => replaceServiceFields(service.id, body),
    invalidates: (_result, { service }) => staleServices(service.id),
    successNotification: (fields, { service }) => ({
      message: 'Fields saved',
      description: `${service.name} has ${fields.length} ${fields.length === 1 ? 'field' : 'fields'}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

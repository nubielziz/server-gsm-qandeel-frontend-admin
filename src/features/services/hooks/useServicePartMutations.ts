// Saving the parts of a service that are replaced as a whole list: group prices, custom fields and option lists. A save makes
// the service's own record stale (the dialogs read it) and, for group prices, the price resolutions. The dialogs show a refusal.
import { useApiMutation } from '@/lib/query';
import { replaceServiceFields, replaceServiceGroupPrices, replaceServiceOptions } from '../api';
import type { ReplaceFieldsBody, ReplaceGroupPricesBody, ReplaceOptionsBody, Service } from '../types';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

const NO_ERROR_TOAST = () => false as const;

type ForService<B> = { service: Service; body: B };

/** Saves the fixed price of a service for each merchant group. */
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

/** Saves the model, network and MEP lists of a service. */
export function useReplaceOptions() {
  return useApiMutation({
    mutationFn: ({ service, body }: ForService<ReplaceOptionsBody>) =>
      replaceServiceOptions(service.id, body),
    invalidates: (_result, { service }) => staleServices(service.id),
    successNotification: (options, { service }) => ({
      message: 'Options saved',
      description: `${service.name} has ${options.length} ${options.length === 1 ? 'option' : 'options'}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

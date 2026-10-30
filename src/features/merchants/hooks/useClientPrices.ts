// A merchant's fixed prices (a Refine list), the services behind the Add override menu, and the actions on a price. Ports the data
// side of merPricingTab and the `m-override` / `m-ov-del` actions of 42-p-merchants.js.
import { useList } from '@refinedev/core';
import { money } from '@/lib/format';
import { useApiMutation, useApiQuery } from '@/lib/query';
import { createClientPrice, deleteClientPrice, updateClientPrice } from '../api';
import { listServiceOptions } from '../api/lookups';
import type { ClientPrice, CreateClientPriceBody, UpdateClientPriceBody } from '../types';
import { LIST_CAP, SERVICE_LOOKUP_KEY } from './keys';

/** The fixed prices of one merchant. Pass `enabled: false` while the staff member lacks `pricing:read`. */
export function useClientPrices(clientId: number, enabled = true) {
  const { result, query } = useList<ClientPrice>({
    resource: 'client-prices',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    filters: [{ field: 'clientId', operator: 'eq', value: clientId }],
    queryOptions: { enabled },
    // The tab shows its own error state with Retry, so Refine's default toast would only repeat it.
    errorNotification: false,
  });
  return { prices: result.data, query };
}

const FIVE_MINUTES = 5 * 60_000;

/** The active services, kept for a few minutes: the catalog changes rarely, and a dialog should not wait for it each time. */
export function useServiceOptions(enabled = true) {
  return useApiQuery({
    queryKey: SERVICE_LOOKUP_KEY,
    queryFn: ({ signal }) => listServiceOptions({ signal }),
    select: (result) => result.data,
    enabled,
    staleTime: FIVE_MINUTES,
  });
}

const NO_ERROR_TOAST = () => false as const;
const pricesOf = (id?: number) => [{ resource: 'client-prices', id }];

/** Sets a fixed price; the server refuses one below the floor, and the dialog shows why under the price. */
export function useCreatePrice() {
  return useApiMutation({
    mutationFn: ({ body }: { body: CreateClientPriceBody; serviceName: string; clientName: string }) =>
      createClientPrice(body),
    invalidates: pricesOf(),
    successNotification: (_row, { body, serviceName, clientName }) => ({
      message: 'Override saved',
      description: `${serviceName} is now ${money(body.price)} for ${clientName}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Changes the price or note of a fixed price. */
export function useUpdatePrice() {
  return useApiMutation({
    mutationFn: ({ price, body }: { price: ClientPrice; body: UpdateClientPriceBody; clientName: string }) =>
      updateClientPrice(price.id, body),
    invalidates: (_row, { price }) => pricesOf(price.id),
    successNotification: (_row, { price, body, clientName }) => ({
      message: 'Override saved',
      description: `${price.service.name} is now ${money(body.price ?? price.price)} for ${clientName}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Removes a fixed price: the merchant pays the group price again. */
export function useDeletePrice() {
  return useApiMutation({
    mutationFn: (price: ClientPrice) => deleteClientPrice(price.id),
    invalidates: (_result, price) => pricesOf(price.id),
    successNotification: () => ({ message: 'Override removed' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

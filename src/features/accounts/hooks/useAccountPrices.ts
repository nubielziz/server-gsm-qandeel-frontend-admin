// An account's fixed prices (a Refine list), the services behind the fixed-price menu, and the actions on a price. Ports the data side of
// merPricingTab and the `m-override` / `m-ov-del` actions of 42-p-merchants.js. Only an account with a merchant rank has fixed prices.
import { useList } from '@refinedev/core';
import { money } from '@/lib/format';
import { useApiMutation, useApiQuery } from '@/lib/query';
import { createAccountPrice, deleteAccountPrice, updateAccountPrice } from '../api';
import { listServiceOptions } from '../api/lookups';
import type { AccountPrice, CreateAccountPriceBody, UpdateAccountPriceBody } from '../types';
import { LIST_CAP, SERVICE_LOOKUP_KEY } from './keys';

/** The fixed prices of one account. Pass `enabled: false` while the staff member lacks `pricing:read` or the rank is not a merchant rank. */
export function useAccountPrices(accountId: number, enabled = true) {
  const { result, query } = useList<AccountPrice>({
    resource: 'client-prices',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    filters: [{ field: 'clientId', operator: 'eq', value: accountId }],
    queryOptions: { enabled },
    // The part shows its own error state with Retry, so Refine's default toast would only repeat it.
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
    mutationFn: ({ body }: { body: CreateAccountPriceBody; serviceName: string; accountName: string }) =>
      createAccountPrice(body),
    invalidates: pricesOf(),
    successNotification: (_row, { body, serviceName, accountName }) => ({
      message: 'Fixed price saved',
      description: `${serviceName} is now ${money(body.price)} for ${accountName}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Changes the price or note of a fixed price. */
export function useUpdatePrice() {
  return useApiMutation({
    mutationFn: ({
      price,
      body,
    }: {
      price: AccountPrice;
      body: UpdateAccountPriceBody;
      accountName: string;
    }) => updateAccountPrice(price.id, body),
    invalidates: (_row, { price }) => pricesOf(price.id),
    successNotification: (_row, { price, body, accountName }) => ({
      message: 'Fixed price saved',
      description: `${price.service.name} is now ${money(body.price ?? price.price)} for ${accountName}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Removes a fixed price: the account pays the rank price again. */
export function useDeletePrice() {
  return useApiMutation({
    mutationFn: (price: AccountPrice) => deleteAccountPrice(price.id),
    invalidates: (_result, price) => pricesOf(price.id),
    successNotification: () => ({ message: 'Fixed price removed' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

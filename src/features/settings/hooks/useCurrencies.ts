// The currencies for the Currencies table and their changes: add one, edit the rate and markup, the "Offered" switch, and Refresh rates.
// Any change makes the dashboard's "exchange rate is out of date" alert stale, so it refreshes too.
import { useList } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { createCurrency, refreshFx, updateCurrency } from '../api';
import type { CreateCurrencyBody, Currency, RefreshFxResult, UpdateCurrencyBody } from '../types';
import { CURRENCY_STALE_KEYS, WHOLE_LIST } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Every currency, loaded whole. Needs `settings:update` (the map's permission for the currency routes). */
export function useCurrencyList(enabled = true) {
  const { result, query } = useList<Currency>({
    resource: 'currencies',
    pagination: { currentPage: 1, pageSize: WHOLE_LIST },
    sorters: [{ field: 'code', order: 'asc' }],
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { currencies: result.data, query };
}

/** Adds a currency. The dialog shows a failure. */
export function useCreateCurrency() {
  return useApiMutation({
    mutationFn: (body: CreateCurrencyBody) => createCurrency(body),
    invalidates: [{ resource: 'currencies' }],
    invalidateKeys: CURRENCY_STALE_KEYS,
    successNotification: (currency) => ({ message: `${currency.code} added` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a currency (the edit dialog). The dialog shows a failure. */
export function useUpdateCurrency() {
  return useApiMutation({
    mutationFn: ({ currency, body }: { currency: Currency; body: UpdateCurrencyBody }) =>
      updateCurrency(currency.id, body),
    invalidates: (_result, { currency }) => [{ resource: 'currencies', id: currency.id }],
    invalidateKeys: CURRENCY_STALE_KEYS,
    successNotification: (currency) => ({ message: `${currency.code} saved` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The "Offered" switch of a row (`st-fx-shown` in the demo). A refusal shows as the default error toast. */
export function useToggleOffered() {
  return useApiMutation({
    mutationFn: ({ currency, shown }: { currency: Currency; shown: boolean }) =>
      updateCurrency(currency.id, { isStorefront: shown }),
    invalidates: (_result, { currency }) => [{ resource: 'currencies', id: currency.id }],
    successNotification: (currency, { shown }) => ({
      message: `${currency.code} is ${shown ? 'offered' : 'hidden'}`,
    }),
  });
}

/**
 * Refresh rates: the server fetches fresh rates and answers what changed and what it could not do. The toast gives the count; the caller
 * shows the full answer (`onDone`). A failed call shows as the default error toast with the server's words.
 */
export function useRefreshRates(onDone: (result: RefreshFxResult) => void) {
  return useApiMutation({
    mutationFn: () => refreshFx(),
    invalidates: [{ resource: 'currencies' }],
    invalidateKeys: CURRENCY_STALE_KEYS,
    successNotification: (result) => {
      const done = result.refreshed?.length ?? 0;
      const failed = result.failed?.length ?? 0;
      return {
        message: `${done} ${done === 1 ? 'rate' : 'rates'} refreshed`,
        description: failed > 0 ? `${failed} could not be refreshed.` : undefined,
      };
    },
    onSuccess: (result) => onDone(result),
  });
}

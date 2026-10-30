// The tax rates for the "Tax by country" table and the changes (add a rate, edit one). The map has no delete. Dialogs show failures.
import { useList } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { createTaxRate, updateTaxRate } from '../api';
import { countryName } from '../lib/tax';
import type { CreateTaxRateBody, TaxRate, UpdateTaxRateBody } from '../types';
import { WHOLE_LIST } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Every tax rate, loaded whole (a dozen countries). Needs `tax:read`. */
export function useTaxRateList(enabled = true) {
  const { result, query } = useList<TaxRate>({
    resource: 'tax-rates',
    pagination: { currentPage: 1, pageSize: WHOLE_LIST },
    sorters: [{ field: 'country', order: 'asc' }],
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { rates: result.data, query };
}

/** Adds a rate. Needs `tax:create`. */
export function useCreateTaxRate() {
  return useApiMutation({
    mutationFn: (body: CreateTaxRateBody) => createTaxRate(body),
    invalidates: [{ resource: 'tax-rates' }],
    successNotification: (rate) => ({ message: `Tax rate for ${countryName(rate.country)} added` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a rate. Needs `tax:update`. */
export function useUpdateTaxRate() {
  return useApiMutation({
    mutationFn: ({ rate, body }: { rate: TaxRate; body: UpdateTaxRateBody }) => updateTaxRate(rate.id, body),
    invalidates: (_result, { rate }) => [{ resource: 'tax-rates', id: rate.id }],
    successNotification: (rate) => ({ message: `Tax rate for ${countryName(rate.country)} saved` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

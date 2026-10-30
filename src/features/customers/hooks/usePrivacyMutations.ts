// The privacy actions (export a customer's data, anonymise them) and the moves of a data request, each with its toast and the
// reads it makes stale. Both customer actions can close a matching request on the server, so the requests refresh too.
import { useApiMutation, type InvalidateTarget } from '@/lib/query';
import { anonymizeCustomer, exportCustomerData, updateDataRequest } from '../api';
import { requestNumber } from '../lib/requests';
import type { Customer, DataRequest, DataRequestStatus, UpdateDataRequestBody } from '../types';
import { CUSTOMER_COUNTS_KEY } from './keys';

const NO_ERROR_TOAST = () => false as const;

const staleRequests = (): InvalidateTarget[] => [{ resource: 'data-requests' }];

/** Downloads the customer's data as a JSON file. The confirm dialog shows a refusal. */
export function useExportCustomerData() {
  return useApiMutation({
    mutationFn: (customer: Pick<Customer, 'id'>) => exportCustomerData(customer.id),
    invalidates: staleRequests,
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: (file) => ({
      message: 'Data exported',
      description: `${file}. Any open export request is marked done.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Anonymises a customer. The confirm dialog shows a refusal. The server also cuts the IMEIs and replaces the buyer on the
 * customer's orders, so the orders refresh too.
 */
export function useAnonymizeCustomer() {
  return useApiMutation({
    mutationFn: (customer: Pick<Customer, 'id'>) => anonymizeCustomer(customer.id),
    invalidates: (_result, customer) => [
      { resource: 'customers', id: customer.id },
      ...staleRequests(),
      { resource: 'orders' },
    ],
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: () => ({
      message: 'Customer anonymised',
      description: 'Any open erasure request is marked done.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

// What the toast says happened to the request.
const MOVED: Record<Exclude<DataRequestStatus, 'open'>, string> = {
  in_progress: 'is in progress',
  completed: 'is done',
  rejected: 'was rejected',
};

/**
 * Moves a data request along. `toastErrors` is false for the Reject dialog, which shows a refusal itself; the row buttons
 * have no dialog, so their failures show as a toast.
 */
export function useUpdateDataRequest({ toastErrors = true }: { toastErrors?: boolean } = {}) {
  return useApiMutation({
    mutationFn: ({ request, body }: { request: Pick<DataRequest, 'id'>; body: UpdateDataRequestBody }) =>
      updateDataRequest(request.id, body),
    invalidates: staleRequests,
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: (_updated, { request, body }) => ({
      message: `${requestNumber(request.id)} ${MOVED[body.status]}`,
    }),
    errorNotification: toastErrors ? undefined : NO_ERROR_TOAST,
  });
}

// The actions on a supplier, each with the toast the demo showed and the reads it makes stale. The dialogs show a failed
// call themselves (in the error slot, or under the field the server named), so their hooks toast no error. Test and Sync
// have no dialog: they keep the default error toast, which carries the server's title and detail.
import { toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import { createSupplier, deleteSupplier, syncSupplier, testSupplier, updateSupplier } from '../api';
import { testSummary } from '../lib/connection';
import type { CreateSupplierBody, Supplier, UpdateSupplierBody } from '../types';
import { staleLogged, staleSupplier, SUPPLIER_STALE_KEYS, SUPPLIER_CATALOGUE_KEY } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The words of an edit's toast, one per field the form can change. */
const FIELD_LABELS: Record<keyof UpdateSupplierBody, string> = {
  name: 'name',
  driver: 'API type',
  baseUrl: 'base URL',
  username: 'username',
  apiKey: 'API key',
  currency: 'currency',
  lowBalanceAlert: 'balance alert',
  maxConcurrency: 'concurrency',
  rateLimitPerMin: 'rate limit',
  timeoutMs: 'timeout',
  status: 'status',
};

/** Connects a supplier. The page selects it and offers "Test connection" in its own toast, so none is raised here. */
export function useCreateSupplier() {
  return useApiMutation({
    mutationFn: (body: CreateSupplierBody) => createSupplier(body),
    // The body carries the write-only API key: drop it from the cache as soon as the dialog is done.
    gcTime: 0,
    invalidates: staleSupplier(),
    invalidateKeys: SUPPLIER_STALE_KEYS,
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a connection; the toast lists which ones changed. */
export function useUpdateSupplier() {
  return useApiMutation({
    mutationFn: ({ supplier, body }: { supplier: Pick<Supplier, 'id'>; body: UpdateSupplierBody }) =>
      updateSupplier(supplier.id, body),
    // An edit may carry a new API key: same rule as above.
    gcTime: 0,
    invalidates: (_updated, { supplier }) => staleSupplier(supplier.id),
    invalidateKeys: SUPPLIER_STALE_KEYS,
    successNotification: (_updated, { body }) => ({
      message: 'Connection updated',
      description: `${(Object.keys(body) as (keyof UpdateSupplierBody)[]).map((key) => FIELD_LABELS[key]).join(', ')} changed.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Switches a supplier off (Disable, with a confirm dialog that shows a failure) or back on (Enable, which toasts one). */
export function useSetSupplierEnabled(options: { toastErrors: boolean }) {
  return useApiMutation({
    mutationFn: ({ supplier, enabled }: { supplier: Pick<Supplier, 'id' | 'name'>; enabled: boolean }) =>
      updateSupplier(supplier.id, { status: enabled ? 'active' : 'disabled' }),
    invalidates: (_updated, { supplier }) => staleSupplier(supplier.id),
    invalidateKeys: SUPPLIER_STALE_KEYS,
    successNotification: (_updated, { supplier, enabled }) =>
      enabled
        ? { message: `${supplier.name} enabled`, description: 'It can receive orders again.' }
        : { message: `${supplier.name} disabled`, description: 'No new orders will be sent to it.' },
    ...(options.toastErrors ? {} : { errorNotification: NO_ERROR_TOAST }),
  });
}

/** Deletes a supplier; the confirm dialog shows the server's refusal when orders or services still use it. */
export function useDeleteSupplier() {
  return useApiMutation({
    mutationFn: (supplier: Pick<Supplier, 'id' | 'name'>) => deleteSupplier(supplier.id),
    invalidates: (_result, supplier) => staleSupplier(supplier.id),
    invalidateKeys: SUPPLIER_STALE_KEYS,
    successNotification: (_result, supplier) => ({ message: `${supplier.name} deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Tests the connection. A good test says who the supplier authenticated and how fast it answered; a test the server
 * reports as failed (`ok: false`) is an error toast with the server's text. An error response keeps the default error toast.
 */
export function useTestSupplier() {
  return useApiMutation({
    mutationFn: (supplier: Pick<Supplier, 'id' | 'name'>) => testSupplier(supplier.id),
    invalidates: (_result, supplier) => staleLogged(supplier.id),
    invalidateKeys: SUPPLIER_STALE_KEYS,
    successNotification: (result, supplier) => {
      if (result.ok) return { message: `${supplier.name} is reachable`, description: testSummary(result) };
      toast({ kind: 'error', title: `${supplier.name} failed the connection test`, body: result.message });
      return false;
    },
  });
}

/** Syncs the services and the balance. The server's refusal (a disabled or unreachable supplier) is the error toast. */
export function useSyncSupplier() {
  return useApiMutation({
    mutationFn: (supplier: Pick<Supplier, 'id' | 'name'>) => syncSupplier(supplier.id),
    invalidates: (_result, supplier) => staleLogged(supplier.id),
    // A sync rewrites the supplier's service list too.
    invalidateKeys: [...SUPPLIER_STALE_KEYS, SUPPLIER_CATALOGUE_KEY],
    successNotification: (result) => ({
      message: `${result.services} services checked`,
      description: `${result.changed > 0 ? `${result.changed} with a changed cost.` : 'No cost changes.'} Balance ${money(result.balance)}.`,
    }),
  });
}

// The service and merchant chosen on the Price resolver tab, and the service and code status chosen on the Code inventory
// tab, kept in the address (`?tab=resolver&service=4&merchant=12`), so "Trace a merchant price" can link straight to a service.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { parsePage, writeView } from '../lib/filters';
import type { InventoryStatus } from '../types';

const digitsOf = (value: string | null): number | null =>
  value && /^\d+$/.test(value) ? Number(value) : null;

const STATUSES: readonly InventoryStatus[] = ['available', 'reserved', 'sold', 'void'];

/**
 * Changes some parameters of the address in one step (an empty value removes the parameter) and keeps the rest, the tab
 * included. With `resetPage` the list goes back to its first page, as it does when a filter changes. The history entry is replaced.
 */
function useParamUpdate() {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (changes: Record<string, string>, resetPage = false) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return resetPage ? writeView(next, { page: 1 }) : next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { params, update };
}

/** The resolver's two choices. `null` means "none chosen yet": the tab then offers the first of each list. */
export function useResolverView() {
  const { params, update } = useParamUpdate();
  return {
    serviceId: digitsOf(params.get('service')),
    clientId: digitsOf(params.get('merchant')),
    setServiceId: (id: string) => update({ service: id }),
    setClientId: (id: string) => update({ merchant: id }),
  };
}

/** The inventory's filters and page. */
export function useInventoryView() {
  const { params, update } = useParamUpdate();
  const raw = params.get('status');
  const status: InventoryStatus | '' = STATUSES.find((candidate) => candidate === raw) ?? '';
  return {
    serviceId: digitsOf(params.get('service')),
    status,
    page: parsePage(params),
    setServiceId: (id: string) => update({ service: id }, true),
    setStatus: (value: string) => update({ status: value }, true),
    setPage: (page: number) => update({ page: page > 1 ? String(page) : '' }),
    clear: () => update({ service: '', status: '' }, true),
  };
}

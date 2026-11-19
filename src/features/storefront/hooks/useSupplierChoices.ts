// The suppliers behind the Publish tab's "A supplier's services" menu, by name (`GET /admin/suppliers`, the suppliers feature's own
// `listSuppliers`, needs `suppliers:read`). A company has a handful of suppliers, so one page of 200 is the whole list.
import { listSuppliers } from '@/features/suppliers';
import { useApiQuery } from '@/lib/query';
import { PICKER_STALE_MS, PUBLISH_SUPPLIERS_KEY } from './keys';

const SUPPLIER_MENU_ROWS = 200;

/** The suppliers by name; `enabled: false` (the role lacks `suppliers:read`) sends nothing. */
export function useSupplierChoices(enabled: boolean) {
  return useApiQuery({
    queryKey: PUBLISH_SUPPLIERS_KEY,
    queryFn: ({ signal }) =>
      listSuppliers({ start: 0, end: SUPPLIER_MENU_ROWS, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result) => result.data.map(({ id, name }) => ({ id, name })),
    enabled,
    staleTime: PICKER_STALE_MS,
  });
}

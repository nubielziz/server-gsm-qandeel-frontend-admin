// One customer for the detail page. `useOne` reads `GET /admin/customers/:id`; every action invalidates it, so the page stays
// fresh after a change. Ports the `cus(id)` lookup of pageCustomer (48-p-customers.js); a 404 becomes the "not found" state.
import { useOne } from '@refinedev/core';
import { isApiError } from '@/lib/api';
import type { CustomerDetail } from '../types';

/**
 * `customer` is the detail once it has loaded, else undefined. It is also undefined while the page moves from one customer
 * to another (Refine keeps the previous answer on screen until the next one arrives), so the wrong person never shows.
 * `notFound` is true when the server answered 404.
 */
export function useCustomer(id: number | undefined) {
  const { result, query } = useOne<CustomerDetail>({
    resource: 'customers',
    id,
    queryOptions: { enabled: id !== undefined },
    errorNotification: false,
  });
  const customer = id !== undefined && result?.id === id ? result : undefined;
  const notFound = query.isError && isApiError(query.error) && query.error.status === 404;
  return { customer, notFound, query };
}

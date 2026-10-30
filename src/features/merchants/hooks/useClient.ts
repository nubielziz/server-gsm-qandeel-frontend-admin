// One merchant for the detail page, read through Refine so every action's invalidation refreshes it. Ports `mer(id)` of 42-p-merchants.js.
import { useOne } from '@refinedev/core';
import type { Client } from '../types';

/** `id` is null when the address holds no usable id; the read is then skipped and the page shows "not found". */
export function useClient(id: number | null) {
  const { result, query } = useOne<Client>({
    resource: 'clients',
    id: id ?? 0,
    queryOptions: { enabled: id !== null },
    // The page shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { client: id === null ? undefined : result, query };
}

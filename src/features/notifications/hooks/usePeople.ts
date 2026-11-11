// The people the picker dialog lists: staff, merchants or customers, a page at a time with a search, through the existing list functions of the access,
// merchants and customers features (each needs its own read permission). A row is cut down to what the picker shows.
import { keepPreviousData } from '@tanstack/react-query';
import { listStaff } from '@/features/access';
import { listCustomers } from '@/features/customers';
import { listClients } from '@/features/merchants';
import { useApiQuery } from '@/lib/query';
import type { ListQuery, ListResult } from '@/lib/api';
import type { PickedPerson } from '../lib/spec';
import type { PersonType } from '../types';
import { PEOPLE_PAGE_SIZE } from './keys';

/** The permission each kind of person's list needs; a tab is hidden when the role lacks it. */
export const PEOPLE_PERMISSION: Record<PersonType, string> = {
  staff: 'staff:read',
  client: 'clients:read',
  customer: 'customers:read',
};

async function load(
  type: PersonType,
  query: ListQuery,
  signal?: AbortSignal,
): Promise<ListResult<PickedPerson>> {
  const init = { signal };
  if (type === 'staff') {
    const { data, total } = await listStaff(query, init);
    return { total, data: data.map((row) => ({ type, id: row.id, name: row.name, detail: row.email })) };
  }
  if (type === 'client') {
    const { data, total } = await listClients(query, init);
    return {
      total,
      data: data.map((row) => ({ type, id: row.id, name: row.company || row.name, detail: row.email })),
    };
  }
  const { data, total } = await listCustomers(query, init);
  return { total, data: data.map((row) => ({ type, id: row.id, name: row.name, detail: row.email })) };
}

export type PeopleArgs = { type: PersonType; q: string; page: number; enabled?: boolean };

/** One page of one kind of person. `rows` keep their place while the next page or search loads. */
export function usePeople({ type, q, page, enabled = true }: PeopleArgs) {
  const query = useApiQuery({
    queryKey: ['api', 'notifications', 'people', type, q, page],
    queryFn: ({ signal }) =>
      load(
        type,
        { start: (page - 1) * PEOPLE_PAGE_SIZE, end: page * PEOPLE_PAGE_SIZE, ...(q ? { q } : {}) },
        signal,
      ),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { rows: query.data?.data ?? [], total: query.data?.total, query };
}

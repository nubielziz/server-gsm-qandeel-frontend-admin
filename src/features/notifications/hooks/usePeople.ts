// The people the picker dialog lists: staff or accounts (a merchant, a shop buyer and a guest are all accounts), a page at a time with a search,
// through the existing list functions of the access and accounts features (each needs its own read permission). A row is cut down to what the picker shows.
import { keepPreviousData } from '@tanstack/react-query';
import { listStaff } from '@/features/access';
import { isMerchantRank, listAccounts } from '@/features/accounts';
import { accountLabel, hasAccountName } from '@/lib/format';
import { useApiQuery } from '@/lib/query';
import type { ListQuery, ListResult } from '@/lib/api';
import type { PickedPerson } from '../lib/spec';
import type { PersonType } from '../types';
import { PEOPLE_PAGE_SIZE } from './keys';

/** The permission each kind of person's list needs; a tab is hidden when the role lacks it. */
export const PEOPLE_PERMISSION: Record<PersonType, string> = {
  staff: 'staff:read',
  account: 'clients:read',
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
  const { data, total } = await listAccounts(query, init);
  return {
    total,
    data: data.map((row) => ({
      type,
      id: row.id,
      // A merchant is named by its company; an account can have an empty name (a guest): the picker and the audience list show the email (or Account #id) instead.
      name: isMerchantRank(row.rank) && row.company ? row.company : accountLabel(row),
      // The email is already the name for an account without one, so it is not said twice.
      detail: hasAccountName(row) ? row.email : undefined,
      rank: { name: row.rank.name, kind: row.rank.kind },
    })),
  };
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

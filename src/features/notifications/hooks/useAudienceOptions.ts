// The roles and merchant ranks the audience builder offers as checkbox lists (`GET /admin/roles`, `GET /admin/client-groups`), each needing its own
// read permission. They change rarely, so they are kept for a few minutes; `names` turns an id into a name for the sentences.
import { listRoles } from '@/features/access';
import { listRanks, ranksOfKind } from '@/features/accounts';
import { useApiQuery } from '@/lib/query';
import { OPTION_LIMIT } from './keys';

export type Option = { id: number; name: string };

const FIVE_MINUTES = 5 * 60_000;

/** The roles (staff segment filter). Needs `roles:read`. */
export function useRoleOptions(enabled: boolean) {
  const query = useApiQuery({
    queryKey: ['api', 'notifications', 'options', 'roles'],
    queryFn: async ({ signal }): Promise<Option[]> => {
      const { data } = await listRoles({ start: 0, end: OPTION_LIMIT }, { signal });
      return data.map(({ id, name }) => ({ id, name }));
    },
    enabled,
    staleTime: FIVE_MINUTES,
  });
  return { options: query.data ?? [], query };
}

/** The merchant ranks (merchant segment filter): the ranks of the merchant kind, in their own order. Needs `groups:read`. */
export function useRankOptions(enabled: boolean) {
  const query = useApiQuery({
    queryKey: ['api', 'notifications', 'options', 'ranks'],
    queryFn: async ({ signal }): Promise<Option[]> => {
      const { data } = await listRanks(
        { start: 0, end: OPTION_LIMIT, sort: ['sort'], order: ['asc'] },
        { signal },
      );
      return ranksOfKind(data, 'merchant').map(({ id, name }) => ({ id, name }));
    },
    enabled,
    staleTime: FIVE_MINUTES,
  });
  return { options: query.data ?? [], query };
}

/** An id to name map for the sentences ("Staff with the role Support"). */
export const namesOf = (options: readonly Option[]): ReadonlyMap<number, string> =>
  new Map(options.map((option) => [option.id, option.name]));

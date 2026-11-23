// One page of the All view: the services of a kind that match the address, sorted and counted by the server. The key starts with the
// shared rows key, so a change made elsewhere (a listing switched, a publish run applied, a supplier link saved) refreshes the page.
// The previous page stays on screen while the next one loads, so the table does not blink between pages and filters.
import { keepPreviousData } from '@tanstack/react-query';
import type { ServiceType } from '@/lib/serviceTypes';
import { SERVICE_ROWS_KEY, useApiQuery } from '@/lib/query';
import { listServices } from '../../../api';
import type { Service } from '../../../types';
import { listQueryOf, type AllAddress, type FilterAccess } from './allAddress';

const NO_ROWS: Service[] = [];

/**
 * `rows` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. `settled` is
 * false while the rows on screen answer an earlier question.
 */
export function useAllList(type: ServiceType, address: AllAddress, access: FilterAccess) {
  const question = listQueryOf(type, address, access);
  const query = useApiQuery({
    queryKey: [...SERVICE_ROWS_KEY, 'all', type, question],
    queryFn: ({ signal }) => listServices(question, { signal }),
    placeholderData: keepPreviousData,
  });
  return {
    rows: query.data?.data ?? NO_ROWS,
    total: query.data?.total,
    settled: query.isSuccess && !query.isPlaceholderData,
    query,
  };
}

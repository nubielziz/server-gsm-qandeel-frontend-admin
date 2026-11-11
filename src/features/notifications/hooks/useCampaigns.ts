// The campaign list as one page of rows plus the server's total. The previous page stays on screen while the next one loads.
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { listCampaigns } from '../api';
import { toListQuery, type CampaignFilters } from '../lib/filters';
import { CAMPAIGNS_KEY } from './keys';

export type CampaignsArgs = {
  filters: CampaignFilters;
  page: number;
  /** False until the staff member's permissions are known. */
  enabled?: boolean;
};

/** `rows` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useCampaigns({ filters, page, enabled = true }: CampaignsArgs) {
  const query = useApiQuery({
    queryKey: [...CAMPAIGNS_KEY, 'list', filters.status, filters.purpose, filters.q.trim(), page],
    queryFn: ({ signal }) => listCampaigns(toListQuery(filters, page), { signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { rows: query.data?.data ?? [], total: query.data?.total, query };
}

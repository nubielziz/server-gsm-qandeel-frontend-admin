// One campaign with its live delivery numbers. While the worker is still sending (or an email is still queued) the page asks again every 5 seconds;
// it stops when the tab is hidden, and the numbers catch up when the tab is shown again.
import { useApiQuery } from '@/lib/query';
import { isApiError } from '@/lib/api';
import { getCampaign } from '../api';
import { needsRefresh } from '../lib/status';
import { CAMPAIGN_REFRESH_MS, CAMPAIGNS_KEY } from './keys';

/** `campaign` is undefined while loading and for an unknown id (`notFound`). */
export function useCampaign(id: number | undefined) {
  const query = useApiQuery({
    queryKey: [...CAMPAIGNS_KEY, 'detail', id ?? 0],
    queryFn: ({ signal }) => getCampaign(id ?? 0, { signal }),
    enabled: id !== undefined,
    refetchInterval: (state) =>
      needsRefresh(state.state.data) && document.visibilityState === 'visible' ? CAMPAIGN_REFRESH_MS : false,
  });
  const notFound = isApiError(query.error) && query.error.status === 404;
  return { campaign: query.data, notFound, query };
}

// The people of a campaign on one channel, a page at a time, with the status filter. Refreshed with the detail while the campaign is in flight.
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { listCampaignRecipients } from '../api';
import type { CampaignChannel, RecipientStatus } from '../types';
import { CAMPAIGN_REFRESH_MS, CAMPAIGNS_KEY } from './keys';

/** Recipients per page. */
export const RECIPIENTS_PAGE_SIZE = 25;

export type RecipientsArgs = {
  campaignId: number;
  channel: CampaignChannel;
  status: RecipientStatus | '';
  page: number;
  /** True while the campaign is in flight: the table follows the sending. */
  live?: boolean;
  enabled?: boolean;
};

export function useRecipients({
  campaignId,
  channel,
  status,
  page,
  live = false,
  enabled = true,
}: RecipientsArgs) {
  const query = useApiQuery({
    queryKey: [...CAMPAIGNS_KEY, 'recipients', campaignId, channel, status, page],
    queryFn: ({ signal }) =>
      listCampaignRecipients(
        campaignId,
        {
          channel,
          start: (page - 1) * RECIPIENTS_PAGE_SIZE,
          end: page * RECIPIENTS_PAGE_SIZE,
          filters: status ? { status } : {},
        },
        { signal },
      ),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: live && document.visibilityState === 'visible' ? CAMPAIGN_REFRESH_MS : false,
  });
  return { rows: query.data?.data ?? [], total: query.data?.total, query };
}

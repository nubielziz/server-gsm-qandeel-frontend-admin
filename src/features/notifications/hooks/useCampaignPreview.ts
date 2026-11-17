// The message of a campaign rendered by the server for one channel, with sample data. Nothing is sent.
import { useApiQuery } from '@/lib/query';
import { previewCampaign } from '../api';
import type { PreviewCampaignBody } from '../types';
import { CAMPAIGNS_KEY } from './keys';

/** `updatedAt` is part of the key, so an edit shows the new text. */
export function useCampaignPreview(id: number, updatedAt: string, body: PreviewCampaignBody, enabled = true) {
  return useApiQuery({
    queryKey: [...CAMPAIGNS_KEY, 'preview', id, updatedAt, body.channel, body.audience ?? ''],
    queryFn: ({ signal }) => previewCampaign(id, body, { signal }),
    enabled,
  });
}

// The live count of the composer: how many people the audience reaches. The request is the one the composer settled on (it waits 400 ms after the
// last change), the previous answer stays on screen while the next one loads, and nothing is asked while the audience is incomplete.
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { previewAudience } from '../api';
import type { AudiencePreviewBody } from '../types';

/** `request` is null when there is nothing worth asking (nobody chosen, a bad country code); the hook then asks nothing. */
export function useAudiencePreview(request: AudiencePreviewBody | null, enabled = true) {
  return useApiQuery({
    queryKey: ['api', 'notifications', 'audience', request === null ? '' : JSON.stringify(request)],
    queryFn: ({ signal }) => previewAudience(request as AudiencePreviewBody, { signal }),
    enabled: enabled && request !== null,
    placeholderData: keepPreviousData,
    // A count goes stale as people join: never reuse an old answer for a new send.
    staleTime: 0,
    gcTime: 60_000,
  });
}

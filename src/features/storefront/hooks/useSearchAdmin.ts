// The reads of the Search tab that are not Refine lists: the report, the preview of a query, the index status (refreshed while a
// rebuild runs) and the pin picker's listings. The three rule lists are Refine resources (`useStorefrontList`).
import { listListings, getSearchIndex, getSearchPreview, getSearchReport } from '../api';
import { useApiQuery } from '@/lib/query';
import type { ReportDays } from '../types';
import {
  PICKER_RESULTS,
  PICKER_STALE_MS,
  REBUILD_POLL_MS,
  SEARCH_INDEX_KEY,
  searchPickerKey,
  searchPreviewKey,
  searchReportKey,
} from './keys';

/** The report of the last 7, 30 or 90 days. A new range keeps the old figures on screen while it loads. */
export function useSearchReport(days: ReportDays, enabled = true) {
  return useApiQuery({
    queryKey: searchReportKey(days),
    queryFn: ({ signal }) => getSearchReport(days, { signal }),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/**
 * The preview of a query. It runs only for a query the staff member sent (`q` is empty until then) and never retries on its
 * own: an engine that is down answers `UNAVAILABLE` and the staff member decides when to ask again.
 */
export function useSearchPreview(q: string, enabled = true) {
  const text = q.trim();
  return useApiQuery({
    queryKey: searchPreviewKey(text),
    queryFn: ({ signal }) => getSearchPreview({ q: text }, { signal }),
    enabled: enabled && text !== '',
    retry: false,
    staleTime: 0,
  });
}

/** The index status. While a rebuild runs it is read every few seconds, so the page shows when the rebuild is done. */
export function useSearchIndex(enabled = true) {
  return useApiQuery({
    queryKey: [...SEARCH_INDEX_KEY],
    queryFn: ({ signal }) => getSearchIndex({ signal }),
    enabled,
    refetchInterval: (query) => (query.state.data?.rebuild.running ? REBUILD_POLL_MS : false),
  });
}

/**
 * The listed services whose title, slug, name or code holds the text: what the pin dialog offers to pin or hide. The
 * server refuses any other service (422), so the menu never shows one.
 */
export function usePinPicker(text: string, enabled = true) {
  const q = text.trim();
  return useApiQuery({
    queryKey: searchPickerKey(q),
    queryFn: ({ signal }) =>
      listListings(
        {
          start: 0,
          end: PICKER_RESULTS,
          q,
          sort: ['publicTitle'],
          order: ['asc'],
          filters: { isListed: true },
        },
        { signal },
      ),
    select: (result) => result.data,
    enabled: enabled && q !== '',
    staleTime: PICKER_STALE_MS,
  });
}

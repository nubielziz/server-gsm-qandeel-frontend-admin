// "Save and next" of the preview: asks the server for the row after the one just saved, with the search and filters of the table, in
// the order of the rows (never the page in memory). So it finds the next row when the saved one left the filter (a "Needs a look"
// row that became ready) or the page ended. No row after it answers null.
import { useCallback } from 'react';
import type { Id } from '@/lib/api';
import { listPublishItems } from '../api';
import type { PublishItem, PublishItemFilters } from '../types';

/** What the next row is asked with: the table's search text and filters, and the id the row must come after. */
export type NextItemArgs = { q: string; filters: PublishItemFilters; afterId: Id };

/** A function that reads the next row of the run, or null when the saved row was the last one. */
export function useNextPublishItem(runId: Id) {
  return useCallback(
    async ({ q, filters, afterId }: NextItemArgs): Promise<PublishItem | null> => {
      const page = await listPublishItems(runId, {
        start: 0,
        end: 1,
        sort: ['id'],
        order: ['asc'],
        q: q.trim() || undefined,
        filters: { ...filters, afterId },
      });
      return page.data[0] ?? null;
    },
    [runId],
  );
}

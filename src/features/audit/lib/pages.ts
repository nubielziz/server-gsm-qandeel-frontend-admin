// Joins the pages that "Show more" loaded into one list.
import type { AuditLog } from '../types';

/**
 * The entries of all loaded pages in order, each id once. The log grows while someone reads it, and a page is a row range:
 * an entry written after page 1 was read moves every row down by one, so page 2 starts with the last row of page 1
 * again. Keeping the first copy stops a repeated row (and a repeated React key).
 */
export function joinPages(pages: readonly { data: readonly AuditLog[] }[]): AuditLog[] {
  const seen = new Set<number>();
  const rows: AuditLog[] = [];
  for (const page of pages) {
    for (const row of page.data) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  return rows;
}

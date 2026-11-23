// pagerItems: which page numbers the footer pager draws (a window around the current page, with a gap mark when pages are cut).

/** A page number, or a mark for the pages left out before or after the window. */
export type PagerItem = number | 'gap-before' | 'gap-after';

/**
 * A window of `span` page numbers (fewer when there are fewer pages) that contains the current page and, when it can,
 * has it in the middle. The first and last page are one click away through the first and last buttons, so they are not forced in.
 */
export function pagerItems(current: number, pages: number, span = 5): PagerItem[] {
  const total = Math.max(1, Math.floor(pages));
  const width = Math.min(Math.max(1, span), total);
  const page = Math.min(Math.max(1, Math.floor(current)), total);
  const start = Math.max(1, Math.min(page - Math.floor(width / 2), total - width + 1));
  const end = start + width - 1;
  const items: PagerItem[] = [];
  if (start > 1) items.push('gap-before');
  for (let n = start; n <= end; n++) items.push(n);
  if (end < total) items.push('gap-after');
  return items;
}

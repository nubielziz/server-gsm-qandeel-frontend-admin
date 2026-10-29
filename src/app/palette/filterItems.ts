// Text filter for the palette's fixed rows. The kit filters only when it is given the whole list, but here server
// results join the list and must stay whatever the typed text is (a hit found by IMEI does not contain it in its
// label), so the app filters the fixed rows itself and tells the kit not to. Same rule as the kit's: every word of the
// query must appear in the label, hint or keywords, in any order and any case.
import type { PaletteItem } from '@/components/ui';

export function filterFixedItems(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const haystack = [item.label, item.hint, ...(item.keywords ?? [])].join(' ').toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

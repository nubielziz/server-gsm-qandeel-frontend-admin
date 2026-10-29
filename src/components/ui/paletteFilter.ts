// Item type and filtering of the command palette. Ports the filter step of paletteItems(q) in 90-app.js.
import type { IconName } from './Icon';

export interface PaletteItem {
  id: string;
  label: string;
  /** Group heading shown above the first item of a run of items with the same group. */
  group?: string;
  /** Muted text after the label (a buyer name, a code). It is searched too. */
  hint?: string;
  icon?: IconName;
  /** Extra search terms that are not shown. */
  keywords?: readonly string[];
  run: () => void;
}

/** Every word of the query must appear in the label, hint or keywords (any order, any case). */
export function filterPaletteItems(items: readonly PaletteItem[], query: string, limit = 14): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? items.filter((item) => {
        const haystack = [item.label, item.hint, ...(item.keywords ?? [])].join(' ').toLowerCase();
        return words.every((word) => haystack.includes(word));
      })
    : items;
  return matches.slice(0, limit);
}

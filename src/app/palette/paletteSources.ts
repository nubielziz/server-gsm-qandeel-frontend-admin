// Where features plug search results into the command palette (the entity search of paletteItems() in 90-app.js).

import type { PaletteItem } from '@/components/ui';
import { ordersPaletteSource } from '@/features/orders';

/**
 * One searchable kind of record. `search` asks the server for matches of the typed text; it should pass `signal` to
 * its API call so a newer keystroke cancels it. Items without their own `group` get the source's `group` heading.
 * `go` opens a path of the console (a result's `run` calls it), so a source needs no router of its own.
 */
export interface PaletteSource {
  /** Stable name of the source (`orders`, `merchants`). */
  id: string;
  /** Heading shown above this source's results ("Orders"). */
  group: string;
  /** Permission needed to search this source (`orders:read`); without it the source is skipped, not answered 403. */
  permission?: string;
  search(query: string, signal: AbortSignal, go: (path: string) => void): Promise<PaletteItem[]>;
}

/**
 * The sources the palette searches while the user types. A feature that has a search endpoint exports a source from
 * its `index.ts` and adds it here (orders, merchants, customers, tickets, services); the palette code needs no change.
 */
export const paletteSources: readonly PaletteSource[] = [ordersPaletteSource];

/** Typed text shorter than this searches only the pages and actions (the demo started at two characters). */
export const MIN_SEARCH_LENGTH = 2;

/** How long the palette waits after the last keystroke before it asks the server. */
export const SEARCH_DEBOUNCE_MS = 200;

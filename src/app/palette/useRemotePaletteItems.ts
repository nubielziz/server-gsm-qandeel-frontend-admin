// Runs the palette sources for the typed text: debounced, cancelled when the text changes, failures ignored.
import { useEffect, useState } from 'react';
import type { PaletteItem } from '@/components/ui';
import { MIN_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS, type PaletteSource } from './paletteSources';

const NONE: PaletteItem[] = [];

// The results of one run, with the heading each source gave them.
async function searchAll(
  sources: readonly PaletteSource[],
  query: string,
  signal: AbortSignal,
): Promise<PaletteItem[]> {
  // `async` turns a source that throws at once into a rejection too.
  const settled = await Promise.allSettled(sources.map(async (source) => source.search(query, signal)));
  return settled.flatMap((result, index) =>
    // One source failing (offline, 403, a bug) must not hide the others, so its rejection is dropped.
    result.status === 'fulfilled'
      ? result.value.map((item) => ({ ...item, group: item.group ?? sources[index].group }))
      : [],
  );
}

/**
 * Results from every source for `query`, in source order. Nothing runs below two characters. The previous results stay
 * on screen until the new ones arrive, so the list does not blink while typing; they are dropped when the text
 * becomes too short.
 */
export function useRemotePaletteItems(query: string, sources: readonly PaletteSource[]): PaletteItem[] {
  const [found, setFound] = useState<PaletteItem[]>(NONE);
  const text = query.trim();
  const active = text.length >= MIN_SEARCH_LENGTH && sources.length > 0;

  useEffect(() => {
    if (!active) {
      setFound(NONE);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchAll(sources, text, controller.signal).then((items) => {
        if (!controller.signal.aborted) setFound(items);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, text, sources]);

  return active ? found : NONE;
}

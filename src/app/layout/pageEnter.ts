// What a routed page needs to play its enter on <main>: the element, and the page that was shown last. The shell fills it; PageEnterMark reads it.
import { createContext, useMemo, useRef, type RefObject } from 'react';

export interface PageEnterTarget {
  /** The <main> of the shell: the one element every page is drawn in. */
  main: RefObject<HTMLElement | null>;
  /** The key of the page whose content was shown last; null until the first page of the console shows. */
  shown: { current: string | null };
}

/** Null outside the shell (a page drawn alone in a test): nothing plays there. */
export const PageEnterContext = createContext<PageEnterTarget | null>(null);

/** The target the shell hands to its pages. `shown` lives in a ref, so it survives a re-render and a recomputed memo. */
export function usePageEnterTarget(main: RefObject<HTMLElement | null>): PageEnterTarget {
  const shown = useRef<string | null>(null);
  return useMemo(() => ({ main, shown }), [main]);
}

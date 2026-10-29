// After a page change, scroll to the top and move focus to <main>, so keyboard and screen-reader users start at the
// new page instead of at the link they followed. Ports the hashchange handler of boot() in 90-app.js.
import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';

/** Only the path counts: changing a tab or filter in the query string must not jump the page or steal focus. */
export function useFocusMainOnNavigation(mainRef: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation();
  // Compared with the previous path, not "first run", so React Strict Mode's second effect run does nothing either.
  const shownPath = useRef(pathname);
  useEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname, mainRef]);
}

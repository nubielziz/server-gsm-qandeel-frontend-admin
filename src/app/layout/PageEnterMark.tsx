// PageEnterMark: tells the shell that a page's content has just been drawn, so <main> plays its enter (a fade and a small rise).
// It draws nothing. Put it inside the page's Suspense boundary: it mounts only when the content shows, never for the loading fallback.
import { useContext, useLayoutEffect } from 'react';
import { PAGE_RISE, playEnter } from '@/lib/motion';
import { PageEnterContext } from './pageEnter';

/**
 * `pageKey` names the page (its resource and view, "orders:list" or "orders:show"): the same key again is the same page, so a tab, a
 * filter or a query parameter never plays it. The first page after the console loads is only remembered. The comparison is with the
 * page shown last, not with a "first run" flag, so Strict Mode's second effect run and a boundary that hides and shows its
 * content again play nothing.
 */
export function PageEnterMark({ pageKey }: { pageKey: string }) {
  const target = useContext(PageEnterContext);
  useLayoutEffect(() => {
    if (!target) return;
    const before = target.shown.current;
    target.shown.current = pageKey;
    if (before === null || before === pageKey) return;
    playEnter(target.main.current, { y: PAGE_RISE });
  }, [target, pageKey]);
  return null;
}

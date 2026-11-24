// leaveLink: where a click would take the app, for the unsaved-changes question (UnsavedGuard). The app uses the plain browser router,
// which cannot hold a move back by itself, so a view watches the clicks on links while it holds unsaved changes and asks this question of
// each one: is it a link inside the app that opens another address in this tab?

/** The address the app is at now, without the hash: a link to it needs no question (the router would not move). */
export type HereAddress = { pathname: string; search: string };

/**
 * The path, query and hash a click that reaches `target` would open, or null when it would not leave this address: the click is not on a
 * link, the link goes to another site or opens another tab or window (`target`), downloads a file, only moves inside the page (`#…`), or
 * names the address the app is at already. The link's address is read the way the browser resolves it, so a relative link counts.
 *
 * @param target what the click reached (`event.target`).
 * @param here the address the app is at now.
 * @param origin the origin that counts as "inside the app"; the page's own by default.
 * @returns the address to open (path, query and hash), or null when the click leaves nothing.
 */
export function leaveLink(
  target: EventTarget | null,
  here: HereAddress,
  origin: string = window.location.origin,
): string | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.hasAttribute('download')) return null;
  const frame = anchor.getAttribute('target');
  if (frame && frame !== '_self') return null;
  if ((anchor.getAttribute('href') ?? '').startsWith('#')) return null;
  const url = new URL(anchor.href);
  if (url.origin !== origin) return null;
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Whether a click is the plain one a link answers with a move inside this tab (a modified or non-primary click opens elsewhere). */
export function isPlainClick(
  event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>,
): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

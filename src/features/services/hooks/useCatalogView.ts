// Which view of the Catalog page is on screen, kept in the address (`?view=settings`, `?view=publish`, nothing for the table). A view
// the role may not use falls back to the first one it may, and the address is replaced with that view's, so a link, a reload or an
// old address never mounts (or reads) a view the role cannot use. Every address is written by `catalogPath`.
import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { catalogPath, type CatalogLink } from '../lib/paths';
import { parseView, resolveView, viewLink, type CatalogView, type ViewAccess } from '../lib/tabs';

/**
 * `access` is undefined until the staff member's permissions are known. `view` is the view to mount: undefined while the
 * permissions load or while the address moves to the fallback view, null when the role may use none. `openView` goes to a Catalog
 * address with a new history entry (Back returns to the view the staff member came from, with its filters).
 */
export function useCatalogView(access: ViewAccess | undefined) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requested = parseView(params);
  const resolved = access ? resolveView(requested, access) : undefined;
  const moving = resolved != null && resolved !== requested;

  const openView = useCallback(
    (link: CatalogLink, options?: { replace?: boolean }) => void navigate(catalogPath(link), options),
    [navigate],
  );

  // The fallback replaces the history entry: Back must not return to the address the role could not use.
  useEffect(() => {
    if (moving && resolved) openView(viewLink(resolved), { replace: true });
  }, [moving, resolved, openView]);

  const view: CatalogView | null | undefined = moving ? undefined : resolved;
  return { view, openView };
}

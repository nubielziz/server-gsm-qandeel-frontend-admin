// Which kind and which view of the Product / Services page are on screen, kept in the address (`?type=server&view=groups`). An unknown kind
// is the default kind. A view that is unknown, or that the role may not use, falls back to the first one it may, and when the address
// named a view the address is replaced with the fallback's, so a link, a reload or an old address never mounts (or reads) a view the role
// cannot use, and the keys of one view never meet another's. Every address is written by `productsPath`.
import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ProductsViewSpec } from '../components/products/types';
import { firstListedView } from '../lib/productsNav';
import {
  isProductsView,
  parseKind,
  productsPath,
  type ProductsLink,
  type ProductsViewId,
} from '../lib/productsPath';

/**
 * `usable` are the views the staff member may use (undefined until their permissions are known). `type` is the kind on the strip.
 * `view` is the view to mount: undefined while the permissions load or while the address moves to the fallback, null when the role may
 * use none. `open` goes to an address with a new history entry (Back returns to where the staff member came from).
 */
export function useProductsAddress(usable: readonly ProductsViewSpec[] | undefined) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rawType = params.get('type');
  const type: ServiceType = parseKind(rawType);
  const rawView = params.get('view');
  const requested = isProductsView(rawView) ? rawView : null;

  const fallback = usable ? firstListedView(usable) : undefined;
  const resolved: ProductsViewId | null | undefined =
    usable === undefined
      ? undefined
      : requested !== null && usable.some((spec) => spec.id === requested)
        ? requested
        : (fallback?.id ?? null);
  // The address names a view and it is not the one to show: replace it (a bare address needs no change; it already opens the first view).
  const moving = resolved != null && rawView !== null && rawView !== resolved;
  const keepType = rawType !== null && parseKind(rawType) === rawType ? type : undefined;

  const open = useCallback(
    (link: ProductsLink, options?: { replace?: boolean }) => void navigate(productsPath(link), options),
    [navigate],
  );

  // The fallback replaces the history entry: Back must not return to the address the role could not use.
  useEffect(() => {
    if (moving && resolved) open({ view: resolved, type: keepType }, { replace: true });
  }, [moving, resolved, keepType, open]);

  const view: ProductsViewId | null | undefined = moving ? undefined : resolved;
  return { type, view, open };
}

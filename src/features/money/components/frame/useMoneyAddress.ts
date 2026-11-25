// Which view of the Money page is on screen, kept in the address (`?view=ledger`; no `view` is the Overview). A view that is unknown, or
// that the role may not use, falls back (the first view of the same tab, then the first view), and when the address named a view the
// address is replaced with the fallback's, so a link, a reload or an old address never mounts a view the role cannot use.
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { moneyPath, resolveView, type MoneyViewId, type MoneyViewSpec } from '../../lib/moneyViews';

/**
 * `usable` are the views the staff member may use (undefined until their permissions are known). `view` is the view to mount: undefined
 * while the permissions load or while the address moves to the fallback, null when the role may use none.
 */
export function useMoneyAddress(usable: readonly MoneyViewSpec[] | undefined) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requested = params.get('view');
  const resolved: MoneyViewId | null | undefined =
    usable === undefined ? undefined : resolveView(requested, usable);
  // The address names a view and it is not the one to show: replace it. The other keys belonged to the refused view and are dropped.
  // A bare address needs no change: it shows the first view the role may use.
  const moving = resolved != null && requested !== null && requested !== resolved;

  // The replace keeps Back from returning to the address the role could not use.
  useEffect(() => {
    if (moving) void navigate(moneyPath(resolved), { replace: true });
  }, [moving, resolved, navigate]);

  const view: MoneyViewId | null | undefined = moving ? undefined : resolved;
  return { view };
}

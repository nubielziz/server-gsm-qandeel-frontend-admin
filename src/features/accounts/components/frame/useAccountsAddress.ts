// Which view of the Accounts page is on screen, kept in the address (`?view=ranks`; no `view` is the All view). A view that is unknown, or
// that the role may not use, falls back to the first one it may, and when the address named a view the address is replaced with the
// fallback's, so a link, a reload or an old address never mounts (or reads) a view the role cannot use. An old `chip=requests` (the shell's
// redirect of the customers page's data requests tab) names the Data requests view. Every address is written by `accountsListPath`.
import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { accountsListPath, type AccountsListState, type AccountsViewName } from '../../lib/paths';
import { legacyChipOf } from '../list/listAddress';
import type { AccountsViewSpec } from '../types';
import { firstListedView } from './accountsViews';

const VIEW_NAMES: readonly AccountsViewName[] = ['all', 'add', 'ranks', 'add-rank', 'edit-rank', 'requests'];

/** Whether an address parameter names one of the views. */
export function isViewName(raw: string | null): raw is AccountsViewName {
  return VIEW_NAMES.some((view) => view === raw);
}

/**
 * `usable` are the views the staff member may use (undefined until their permissions are known). `view` is the view to mount:
 * undefined while the permissions load or while the address moves to the fallback, null when the role may use none. `open` goes to an
 * address with a new history entry (Back returns to where the staff member came from).
 */
export function useAccountsAddress(usable: readonly AccountsViewSpec[] | undefined) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rawView = params.get('view');
  // The old address of the data requests tab names the view through `chip`.
  const oldRequests = rawView === null && legacyChipOf(params) === 'requests';
  const requested: AccountsViewName | null = isViewName(rawView) ? rawView : oldRequests ? 'requests' : null;

  const fallback = usable ? firstListedView(usable) : undefined;
  const resolved: AccountsViewName | null | undefined =
    usable === undefined
      ? undefined
      : requested !== null && usable.some((spec) => spec.id === requested)
        ? requested
        : (fallback?.id ?? null);
  // The address names a view and it is not the one to show (or it is the old spelling of one): replace it. A bare address needs no change.
  const moving = resolved != null && ((rawView !== null && rawView !== resolved) || oldRequests);

  const open = useCallback(
    (link: AccountsListState, options?: { replace?: boolean }) =>
      void navigate(accountsListPath(link), options),
    [navigate],
  );

  // The fallback replaces the history entry: Back must not return to the address the role could not use.
  useEffect(() => {
    if (moving && resolved) open({ view: resolved }, { replace: true });
  }, [moving, resolved, open]);

  const view: AccountsViewName | null | undefined = moving ? undefined : resolved;
  return { view, open };
}

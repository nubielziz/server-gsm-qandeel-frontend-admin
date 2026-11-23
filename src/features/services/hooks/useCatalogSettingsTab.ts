// The open tab of the Catalog settings, kept in the address (`?view=settings&tab=rules`). A tab change starts the new tab clean: the
// filters of one tab mean nothing to another (the resolver's `service` is not the code stock's), so they are dropped. An unknown or
// forbidden tab falls back to the first tab the role may open, as the address without a tab does.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { catalogPath } from '../lib/paths';
import type { CatalogSettingsTab, SettingsTabSpec } from '../lib/tabs';

/** `visible` are the tabs the role may open, in order. `current` is undefined only when there are none. */
export function useCatalogSettingsTab(visible: readonly SettingsTabSpec[]) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get('tab');
  const current = visible.find((spec) => spec.id === raw) ?? visible[0];

  /** Opens a tab. A new history entry is added, so Back returns to the tab the staff member came from. */
  const setTab = useCallback(
    (tab: CatalogSettingsTab) => void navigate(catalogPath({ view: 'settings', tab })),
    [navigate],
  );

  return { current, setTab };
}

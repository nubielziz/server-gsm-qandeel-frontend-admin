// The open view of the Alerts & incidents tab (`?view=`) and the open incident (`?incident=`), kept in the address so a
// link or a reload shows the same screen. Ports no demo page.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useHealthGrants } from '../../hooks';
import {
  parseIncidentId,
  readableViews,
  resolveView,
  type AlertsViewDef,
  type AlertsViewId,
} from './alertsView';
import { useIncidentDrawer } from './useIncidentDrawer';

/** Parameters that belong to one view, not to the tab: they go when the view changes. */
const VIEW_PARAMS = ['incident', 'status', 'page'];

export interface AlertsViewState {
  /** The views this staff member may read, in strip order. */
  views: AlertsViewDef[];
  /** The view on screen; undefined only when the role can read none of them. */
  view: AlertsViewId | undefined;
  setView: (next: AlertsViewId) => void;
  /** The incident whose drawer is open, or null. Only the Incidents view has a drawer. */
  incident: number | null;
  openIncident: (id: number) => void;
  closeIncident: () => void;
}

/**
 * A view the role cannot read is not offered, and the tab falls back to the first readable one. The first readable view is
 * the default and leaves no `view` parameter. Changing view replaces the history entry (Back should leave the page, like the
 * tab strip above) and drops the old view's own parameters. Opening an incident adds an entry so Back closes the drawer;
 * closing goes Back when the drawer was opened here (`useIncidentDrawer`).
 */
export function useAlertsView(): AlertsViewState {
  const grants = useHealthGrants();
  const [params, setParams] = useSearchParams();
  const views = useMemo(() => readableViews(grants.can), [grants]);
  const view = resolveView(
    params.get('view'),
    params.get('incident'),
    views.map((item) => item.id),
  );
  const first = views[0]?.id;
  const incident = view === 'incidents' ? parseIncidentId(params.get('incident')) : null;

  const setView = useCallback(
    (next: AlertsViewId) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          for (const key of VIEW_PARAMS) updated.delete(key);
          if (next === first) updated.delete('view');
          else updated.set('view', next);
          return updated;
        },
        { replace: true },
      ),
    [first, setParams],
  );

  const { openIncident, closeIncident } = useIncidentDrawer();

  return { views, view, setView, incident, openIncident, closeIncident };
}

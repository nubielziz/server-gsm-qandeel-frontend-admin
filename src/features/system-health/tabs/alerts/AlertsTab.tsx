// AlertsTab: the Alerts & incidents tab of the System health page. Three views in the address (`?view=alerts|rules|incidents`):
// the fired alerts, the alert rules and the incidents with their drawer (`?incident=<id>`). No demo page; routes
// `/admin/alerts`, `/admin/alert-rules` and `/admin/incidents` (docs/system-health-design.md, "Tabs").
import { EmptyState, Panel, SectionTabs } from '@/components/ui';
import { PartBoundary } from '../../header/PartBoundary';
import { AlertsView } from './AlertsView';
import { IncidentsView } from './IncidentsView';
import { RulesView } from './RulesView';
import { useAlertsView } from './useAlertsView';

/**
 * Only composes: the view strip and the open view. A view the role cannot read is not offered (the tab falls back to the
 * first readable one), and a single readable view needs no strip. One `PartBoundary` wraps the open view: a view that fails
 * to draw shows its note and leaves the strip alone, and it is tried again when another view is chosen (`resetKey`).
 * Inside a view each card (`HealthCard`) handles its own read failing.
 */
export function AlertsTab() {
  const { views, view, setView, incident, openIncident, closeIncident } = useAlertsView();
  const current = views.find((item) => item.id === view);
  if (!view || !current) {
    // The page offers this tab only to roles that read alerts or incidents, and draws it once the permissions are known, so
    // this is a safety net for a tab opened without either permission, not a state a staff member meets.
    return (
      <Panel>
        <EmptyState icon="lock" title="Nothing here for your role">
          Your role cannot read alerts or incidents. Ask an administrator to add alerts:read or
          incidents:read.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {views.length > 1 && (
        <SectionTabs
          items={views.map((item) => ({ value: item.id, label: item.label }))}
          value={view}
          onChange={setView}
          label="Alerts and incidents views"
        />
      )}
      <PartBoundary name={`The ${current.label.toLowerCase()} view`} resetKey={view}>
        {view === 'alerts' && <AlertsView />}
        {view === 'rules' && <RulesView />}
        {view === 'incidents' && (
          <IncidentsView openId={incident} onOpen={openIncident} onClose={closeIncident} />
        )}
      </PartBoundary>
    </div>
  );
}

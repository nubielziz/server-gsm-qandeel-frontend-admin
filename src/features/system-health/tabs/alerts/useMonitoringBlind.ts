// Whether the server says the alert rules cannot be checked right now, so an empty list of alerts must not read as "all clear".
// Reads the page's health summary (shared query). No demo page.
import { useHealthGrants, useSystemHealth } from '../../hooks';

/**
 * True when the health summary says monitoring is unavailable, or that the open-alert count cannot be worked out (MISMATCHES
 * M213). It is only a reading of what the server sent. Without `system:read`, or while the summary loads, it is false: the
 * console cannot tell, and says nothing.
 */
export function useMonitoringBlind(): boolean {
  const grants = useHealthGrants();
  const health = useSystemHealth(grants.ready && grants.can('system:read'));
  const summary = health.data;
  return (
    summary !== undefined &&
    (summary.monitoring.status === 'unavailable' || summary.alerts.open.value === null)
  );
}

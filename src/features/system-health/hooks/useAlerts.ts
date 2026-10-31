// Reads of the Alerts & incidents tab: fired alerts, alert rules and incidents, each as a page of a list or one record.
// Alerts poll fast (a new one is news); rules and incidents change by hand, so they poll at the normal rate.
import type { Id } from '@/lib/api';
import { getAlert, getIncident, listAlertRules, listAlerts, listIncidents } from '../api';
import type { AlertFilters, IncidentFilters } from '../types';
import { FIRST_PAGE, healthKey, POLL, type HealthPage } from './keys';
import { useHealthQuery } from './useHealthQuery';

/** One page of fired alerts, newest first, narrowed by status and severity. */
export function useAlerts(filters: AlertFilters, page: HealthPage = FIRST_PAGE, enabled = true) {
  return useHealthQuery({
    key: healthKey('alerts', filters.status ?? null, filters.severity ?? null, page.start, page.end),
    read: (init) =>
      listAlerts(
        {
          start: page.start,
          end: page.end,
          sort: ['startedAt'],
          order: ['desc'],
          filters: { status: filters.status, severity: filters.severity },
        },
        init,
      ),
    poll: POLL.fast,
    enabled,
  });
}

/**
 * One alert; stays disabled until an id is given (for example the alert picked to declare an incident from). Another
 * alert never shows the previous alert's data while it loads.
 */
export function useAlert(id?: Id, enabled = true) {
  return useHealthQuery({
    key: healthKey('alert', id ?? null),
    read: (init) => {
      // Unreachable: the query is disabled without an id. It keeps the type narrow.
      if (id === undefined) throw new Error('useAlert needs an id');
      return getAlert(id, init);
    },
    poll: POLL.fast,
    enabled: enabled && id !== undefined,
    keepPrevious: () => false,
  });
}

/** One page of alert rules. */
export function useAlertRules(page: HealthPage = FIRST_PAGE, enabled = true) {
  return useHealthQuery({
    key: healthKey('alert-rules', page.start, page.end),
    read: (init) => listAlertRules({ start: page.start, end: page.end }, init),
    poll: POLL.normal,
    enabled,
  });
}

/** One page of incidents, newest first, narrowed by status or to the open ones. */
export function useIncidents(filters: IncidentFilters, page: HealthPage = FIRST_PAGE, enabled = true) {
  return useHealthQuery({
    key: healthKey('incidents', filters.status ?? null, filters.open ?? null, page.start, page.end),
    read: (init) =>
      listIncidents(
        {
          start: page.start,
          end: page.end,
          sort: ['startedAt'],
          order: ['desc'],
          filters: { status: filters.status, open: filters.open },
        },
        init,
      ),
    poll: POLL.normal,
    enabled,
  });
}

/**
 * One incident with its timeline (the drawer); stays disabled until an id is given. Another incident never shows the
 * previous incident's data while it loads.
 */
export function useIncident(id?: Id, enabled = true) {
  return useHealthQuery({
    key: healthKey('incident', id ?? null),
    read: (init) => {
      // Unreachable: the query is disabled without an id. It keeps the type narrow.
      if (id === undefined) throw new Error('useIncident needs an id');
      return getIncident(id, init);
    },
    poll: POLL.normal,
    enabled: enabled && id !== undefined,
    keepPrevious: () => false,
  });
}

// Registers the CRUD resources of System health (alerts, alert rules, incidents) for Refine's data hooks (decision 005).
// The data provider calls these same typed functions, so Refine hooks and the feature's hooks share one code path.
import type { ResourceRegistry } from '@/lib/api';
import {
  createAlertRule,
  deleteAlertRule,
  getAlertRule,
  listAlertRules,
  updateAlertRule,
} from './alertRules';
import { getAlert, listAlerts } from './alerts';
import { createIncident, getIncident, listIncidents, updateIncident } from './incidents';

/**
 * Alerts are fired by the server, so they can be listed and read (acknowledging is an action, not an update); rules
 * have all five operations; incidents can be declared and updated but never deleted (the map's `LSCU`).
 */
export const systemHealthResources: ResourceRegistry = {
  alerts: { list: listAlerts, show: getAlert },
  'alert-rules': {
    list: listAlertRules,
    show: getAlertRule,
    create: createAlertRule,
    update: updateAlertRule,
    delete: deleteAlertRule,
  },
  incidents: { list: listIncidents, show: getIncident, create: createIncident, update: updateIncident },
};

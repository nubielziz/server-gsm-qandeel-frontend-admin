// The writes of the Alerts & incidents tab: acknowledge an alert, create, change and delete alert rules, declare and
// update incidents. Each toasts what changed (a refusal is a toast or is left to the dialog, `toastErrors`) and makes
// stale the health reads and the Refine resource it changes (`api/resources.ts` serves Refine's data hooks).
import type { Id } from '@/lib/api';
import { useApiMutation } from '@/lib/query';
import {
  ackAlert,
  createAlertRule,
  createIncident,
  deleteAlertRule,
  updateAlertRule,
  updateIncident,
} from '../api';
import type {
  AckAlertBody,
  CreateAlertRuleBody,
  CreateIncidentBody,
  UpdateAlertRuleBody,
  UpdateIncidentBody,
} from '../types';
import { ALERT_READS, healthKey, INCIDENT_READS } from './keys';
import {
  ackToast,
  errorToast,
  incidentUpdateToast,
  ruleUpdateToast,
  type MutationToastOptions,
} from './toasts';

/**
 * Acknowledges an alert, with an optional note (`alerts:update`). The alert lists change, and so does the health
 * summary, which carries the open alerts.
 */
export function useAckAlert(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: Id; body: AckAlertBody }) => ackAlert(id, body),
    invalidates: (_alert, { id }) => [{ resource: 'alerts', id }],
    invalidateKeys: [...ALERT_READS, healthKey('health')],
    successNotification: () => ackToast(),
    ...errorToast(options),
  });
}

/** Adds an alert rule (`alerts:create`). */
export function useCreateAlertRule(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: (body: CreateAlertRuleBody) => createAlertRule(body),
    invalidates: [{ resource: 'alert-rules' }],
    invalidateKeys: [healthKey('alert-rules')],
    successNotification: (_rule, body) => ({ message: 'Alert rule created', description: body.name }),
    ...errorToast(options),
  });
}

/**
 * Changes a rule (`alerts:update`): an edit, a switch on or off (`isActive`), or a mute (`mutedUntil`). Alerts carry a
 * copy of their rule, and a switched-off or muted rule can resolve its alerts, so the alert lists and the health
 * summary are read again too.
 */
export function useUpdateAlertRule(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: Id; body: UpdateAlertRuleBody }) => updateAlertRule(id, body),
    invalidates: (_rule, { id }) => [{ resource: 'alert-rules', id }, { resource: 'alerts' }],
    invalidateKeys: [healthKey('alert-rules'), ...ALERT_READS, healthKey('health')],
    successNotification: (rule, { body }) => ruleUpdateToast(body, rule),
    ...errorToast(options),
  });
}

/**
 * Deletes a rule (`alerts:delete`). Only the lists are refreshed in Refine: the rule's own record is gone, and asking
 * for it again would be a 404.
 */
export function useDeleteAlertRule(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: (id: Id) => deleteAlertRule(id),
    invalidates: [{ resource: 'alert-rules', invalidates: ['list', 'many'] }, { resource: 'alerts' }],
    invalidateKeys: [healthKey('alert-rules'), ...ALERT_READS, healthKey('health')],
    successNotification: () => ({ message: 'Alert rule deleted' }),
    ...errorToast(options),
  });
}

/**
 * Declares an incident (`incidents:create`), on its own or from an alert. An alert that was declared into an incident
 * shows it, and the health summary lists the ongoing incidents, so both are read again.
 */
export function useCreateIncident(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: (body: CreateIncidentBody) => createIncident(body),
    invalidates: [{ resource: 'incidents' }, { resource: 'alerts' }],
    invalidateKeys: [...INCIDENT_READS, ...ALERT_READS, healthKey('health')],
    successNotification: (_incident, body) => ({ message: 'Incident declared', description: body.title }),
    ...errorToast(options),
  });
}

/**
 * Posts an update, edits or closes an incident (`incidents:update`). The server writes the timeline line. The open
 * drawer, the list and the health summary (ongoing incidents) are read again.
 */
export function useUpdateIncident(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: Id; body: UpdateIncidentBody }) => updateIncident(id, body),
    invalidates: (_incident, { id }) => [{ resource: 'incidents', id }],
    invalidateKeys: [...INCIDENT_READS, healthKey('health')],
    successNotification: (incident, { body }) => incidentUpdateToast(body, incident),
    ...errorToast(options),
  });
}

// Alert rules, fired alerts and incidents: `/admin/alert-rules`, `/admin/alerts` (+ `/ack`) and `/admin/incidents`.
// Built from the generated rows of alert_rules, alert_events and incidents, with the enums narrowed (assumed values).
import type { Id, IsoDateTime } from '@/lib/api';
import type { AlertEventRow, AlertRuleRow, IncidentRow } from '@/lib/api/schema.gen';
import type { MeasureUnit, StaffRef } from './common';

/** How loud an alert is. The map names `critical`; `info` and `warning` are assumed. */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Life of a fired alert: firing, then acknowledged by staff, then resolved (by the server when the value recovers). */
export type AlertStatus = 'firing' | 'acknowledged' | 'resolved';

/** How a rule compares the metric with its threshold. */
export type AlertComparator = 'gt' | 'gte' | 'lt' | 'lte';

/** Where a rule sends its message (map: Telegram or email). */
export type AlertChannel = 'telegram' | 'email';

/** One alert rule (`alert_rules`). `mutedUntil` in the future means muted; `isActive` false means switched off. */
export interface AlertRule extends Pick<
  AlertRuleRow,
  'id' | 'key' | 'name' | 'metric' | 'threshold' | 'windowSeconds' | 'isActive' | 'mutedUntil' | 'createdAt'
> {
  comparator: AlertComparator;
  severity: AlertSeverity;
  channels: AlertChannel[];
  /** Unit of the metric, so the threshold prints as "20 %" or "800 ms"; null for plain numbers. */
  unit: MeasureUnit | null;
  /** True while an alert of this rule is firing or acknowledged. Worked out by the server. */
  open: boolean;
  updatedAt: IsoDateTime | null;
}

/** Body of `POST /admin/alert-rules`. */
export interface CreateAlertRuleBody {
  key: string;
  name: string;
  metric: string;
  comparator: AlertComparator;
  threshold: number;
  windowSeconds: number;
  severity: AlertSeverity;
  channels: AlertChannel[];
  isActive?: boolean;
}

/** Body of `PATCH /admin/alert-rules/:id`: only what changes. Mute with `mutedUntil`, switch with `isActive`. */
export type UpdateAlertRuleBody = Partial<CreateAlertRuleBody> & { mutedUntil?: IsoDateTime | null };

/** The rule an alert came from, as the alert carries it (so a list needs no second call). */
export interface AlertRuleRef {
  id: Id;
  key: string;
  name: string;
  metric: string;
  comparator: AlertComparator;
  threshold: number;
  windowSeconds: number;
  unit: MeasureUnit | null;
}

/** One fired alert (`alert_events`). `subjectLabel` names the supplier or account it is about. */
export interface AlertEvent extends Pick<
  AlertEventRow,
  'id' | 'ruleId' | 'value' | 'subjectType' | 'subjectId' | 'startedAt' | 'acknowledgedAt' | 'resolvedAt'
> {
  status: AlertStatus;
  severity: AlertSeverity;
  rule: AlertRuleRef;
  subjectLabel: string | null;
  acknowledgedBy: StaffRef | null;
  note: string | null;
  /** The incident declared from this alert, if any. */
  incidentId: Id | null;
}

/** Field filters of `GET /admin/alerts`. */
export interface AlertFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
}

/** Body of `POST /admin/alerts/:id/ack`. */
export interface AckAlertBody {
  note?: string;
}

/** How bad an incident is (map example: `major`). */
export type IncidentSeverity = 'minor' | 'major' | 'critical';

/** Where an incident stands; each change adds a timeline line. `resolved` closes it. */
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

/** One line of an incident's timeline (`incidents.timeline` jsonb), written by the server on every update. */
export interface IncidentTimelineEntry {
  at: IsoDateTime;
  status: IncidentStatus;
  text: string;
  by: StaffRef | null;
}

/** One incident (`incidents`). `components` are the component keys of `GET /admin/system/health`. */
export interface Incident extends Pick<
  IncidentRow,
  'id' | 'title' | 'components' | 'summary' | 'startedAt' | 'resolvedAt' | 'alertEventId' | 'createdAt'
> {
  severity: IncidentSeverity;
  status: IncidentStatus;
  timeline: IncidentTimelineEntry[];
  rootCause: string | null;
  createdBy: StaffRef | null;
  resolvedBy: StaffRef | null;
  updatedAt: IsoDateTime | null;
}

/** Field filters of `GET /admin/incidents`. `open: true` means every status but resolved. */
export interface IncidentFilters {
  status?: IncidentStatus;
  open?: boolean;
}

/** Body of `POST /admin/incidents`: declare one, optionally from an alert. The timeline starts at "investigating". */
export interface CreateIncidentBody {
  title: string;
  severity: IncidentSeverity;
  components: string[];
  summary: string;
  alertEventId?: Id | null;
}

/**
 * Body of `PATCH /admin/incidents/:id`. `status` with `update` adds a timeline line (the server writes it); closing
 * sends `status: 'resolved'` with `rootCause`.
 */
export interface UpdateIncidentBody {
  title?: string;
  severity?: IncidentSeverity;
  components?: string[];
  summary?: string;
  status?: IncidentStatus;
  update?: string;
  rootCause?: string;
}

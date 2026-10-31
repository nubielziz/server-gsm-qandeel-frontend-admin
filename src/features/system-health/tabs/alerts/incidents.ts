// Helpers of the Incidents view and its dialogs: the filter choices, how long an incident ran, and what "Declare incident"
// prefills from an alert. Pure functions, no demo page.
import type { SegmentItem, SelectOption } from '@/components/ui';
import { ageText, fmtTime } from '@/lib/format';
import type {
  AlertEvent,
  AlertSeverity,
  Incident,
  IncidentFilters,
  IncidentSeverity,
  IncidentStatus,
} from '../../types';
import { conditionText, subjectText } from './condition';

/** `ongoing` is every status but resolved (the server's `open=true`). */
export type IncidentChoice = 'ongoing' | 'resolved' | 'all';

/** The choice shown when the address names none; it leaves no `?status=`. */
export const DEFAULT_INCIDENT_CHOICE: IncidentChoice = 'ongoing';

/** The segments of the incidents filter. */
export const INCIDENT_CHOICES: readonly SegmentItem<IncidentChoice>[] = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

/** `?status=` as a choice. Missing or unknown text is the default. */
export function parseIncidentChoice(raw: string | null): IncidentChoice {
  return INCIDENT_CHOICES.find((choice) => choice.value === raw)?.value ?? DEFAULT_INCIDENT_CHOICE;
}

/** The server filter of a choice. */
export function incidentFilters(choice: IncidentChoice): IncidentFilters {
  if (choice === 'ongoing') return { open: true };
  if (choice === 'resolved') return { status: 'resolved' };
  return {};
}

/** How long an incident ran (or has run so far when it is not resolved), in minutes and hours: "28m", "1h 12m". */
export function incidentDuration(
  incident: Pick<Incident, 'startedAt' | 'resolvedAt'>,
  now: number,
): { text: string; ongoing: boolean } | null {
  const start = incident.startedAt ? Date.parse(incident.startedAt) : Number.NaN;
  if (Number.isNaN(start)) return null;
  const end = incident.resolvedAt ? Date.parse(incident.resolvedAt) : now;
  if (Number.isNaN(end)) return null;
  return { text: ageText(Math.max(0, end - start)), ongoing: incident.resolvedAt === null };
}

/** The severity choices of the Declare incident form. */
export const INCIDENT_SEVERITY_OPTIONS: readonly SelectOption[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
];

/** The statuses a staff member can post an update with. Resolved is Close incident, which asks for the root cause. */
export const UPDATE_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified', label: 'Identified' },
  { value: 'monitoring', label: 'Monitoring' },
];

/** The status to start an update form on: the incident's own, unless it is one an update cannot set. */
export function updateStatusFor(status: IncidentStatus): IncidentStatus {
  return UPDATE_STATUS_OPTIONS.some((option) => option.value === status) ? status : 'investigating';
}

/** The incident severity an alert suggests. A starting point in the form, which the staff member can change. */
export function incidentSeverityFor(alert: AlertSeverity): IncidentSeverity {
  if (alert === 'critical') return 'critical';
  return alert === 'warning' ? 'major' : 'minor';
}

/**
 * The component keys an alert points at, when it says so: a supplier alert names `supplier:<id>`, a queue alert is the
 * workers. Anything else (the platform, a ledger account) leaves the choice to the staff member.
 */
export function componentsFor(alert: Pick<AlertEvent, 'subjectType' | 'subjectId'>): string[] {
  if (alert.subjectType === 'supplier') return [`supplier:${alert.subjectId}`];
  if (alert.subjectType === 'queue') return ['workers'];
  return [];
}

/** "api, supplier:3" as a list of component keys: trimmed, no empty entries, no repeats. */
export function splitKeys(text: string): string[] {
  return [
    ...new Set(
      text
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ];
}

export interface DeclareValues {
  title: string;
  severity: IncidentSeverity;
  components: string[];
  summary: string;
}

/** The empty form of "Declare incident" when it does not start from an alert. */
export const BLANK_INCIDENT: DeclareValues = { title: '', severity: 'major', components: [], summary: '' };

/**
 * The form of "Declare incident" filled from an alert: its rule and subject as the title, its severity, the component it
 * points at and a first summary line that says what was measured. The staff member edits all of it.
 */
export function declareDefaults(alert: AlertEvent): DeclareValues {
  const subject = subjectText(alert);
  const named = alert.subjectType !== 'system';
  const started = fmtTime(alert.startedAt);
  return {
    title: named ? `${alert.rule.name} · ${subject.name}` : alert.rule.name,
    severity: incidentSeverityFor(alert.severity),
    components: componentsFor(alert),
    summary:
      `${alert.rule.name}${named ? ` for ${subject.name}` : ''}: ${conditionText(alert.value, alert.rule)}.` +
      (started ? ` Started at ${started}.` : ''),
  };
}

// Pure helpers of the Overview tab's alerts and incidents card (route group `health`): their order and the words around
// them. The server sends every severity and status; these only order them and look names up.
import type {
  AlertSeverity,
  AlertSummary,
  HealthComponent,
  IncidentSeverity,
  IncidentSummary,
} from '../../types';

const ALERT_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
const INCIDENT_RANK: Record<IncidentSeverity, number> = { critical: 0, major: 1, minor: 2 };

// A severity the console does not know goes last: it should not push a known critical one down.
function rankOf<K extends string>(table: Record<K, number>, key: string): number {
  return Object.hasOwn(table, key) ? table[key as K] : Object.keys(table).length;
}

/** Open alerts, worst severity first (critical, warning, info). Alerts of one severity keep the server's order. */
export function sortAlerts(items: readonly AlertSummary[]): AlertSummary[] {
  return [...items].sort((a, b) => rankOf(ALERT_RANK, a.severity) - rankOf(ALERT_RANK, b.severity));
}

/** Ongoing incidents, worst severity first (critical, major, minor). Incidents of one severity keep the server's order. */
export function sortIncidents(items: readonly IncidentSummary[]): IncidentSummary[] {
  return [...items].sort((a, b) => rankOf(INCIDENT_RANK, a.severity) - rankOf(INCIDENT_RANK, b.severity));
}

/**
 * How many open alerts the summary counts but does not list. The list can be shorter than the count, and the rest should
 * be said ("+2 more"), not dropped. With no count (null: the rules cannot be evaluated) there is nothing to add.
 */
export function unlistedAlerts(open: number | null, listed: number): number {
  return open === null ? 0 : Math.max(0, open - listed);
}

/** The names of an incident's components: the name the summary knows for a key, the key itself otherwise. */
export function componentNames(keys: readonly string[], components: readonly HealthComponent[]): string[] {
  return keys.map((key) => components.find((component) => component.key === key)?.name ?? key);
}

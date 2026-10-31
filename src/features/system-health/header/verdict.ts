// The words of the verdict panel: how an overall status looks, since when, which components are broken and how many are
// fine. Pure functions over the server's answer; they only choose words and order, never decide a status.
import type { BadgeTone, IconName } from '@/components/ui';
import { ageText, dayKey, fmtDate, fmtTime } from '@/lib/format';
import { healthPath, sortProblemsFirst, statusMeta } from '../lib';
import type { AlertSeverity, AlertSummary, HealthComponent, OverallStatus, SystemHealth } from '../types';

/** Tone, icon and headline of the verdict. */
export interface VerdictLook {
  tone: BadgeTone;
  icon: IconName;
  word: string;
}

/** The verdict when the health call itself failed: neutral, never green, and not "Operational". */
export const STATUS_UNAVAILABLE: VerdictLook = { tone: 'neutral', icon: 'info', word: 'Status unavailable' };

/**
 * Operational is good, Degraded warn, Outage critical. An unknown status is neutral and says why: monitoring is down
 * ("Monitoring unavailable") or the server simply could not tell ("Status unknown"). A status the console does not know
 * prints as neutral text, never as green.
 *
 * "Operational" while monitoring is down is shown as "Monitoring unavailable" too. The contract sends `unknown` then;
 * this only keeps a contradictory answer from being drawn green (no data is never healthy). It decides no status.
 */
export function verdictLook(status: OverallStatus, monitoringUnavailable: boolean): VerdictLook {
  if (status === 'operational' && monitoringUnavailable) return verdictLook('unknown', true);
  const { tone, icon, word } = statusMeta(status);
  if (status === 'unknown') {
    return { tone, icon, word: monitoringUnavailable ? 'Monitoring unavailable' : 'Status unknown' };
  }
  return { tone, icon, word };
}

/**
 * "since 14:02 (38m)", or with the date when it began on an earlier day: "since 22 Oct, 08:14 (9d)". Null when the server
 * sent no time, or one that cannot be read.
 */
export function sinceText(since: string | null | undefined, now: number): string | null {
  const start = since ? Date.parse(since) : Number.NaN;
  if (Number.isNaN(start)) return null;
  const when = dayKey(start) === dayKey(now) ? fmtTime(start) : fmtDate(start);
  return `since ${when} (${ageText(now - start)})`;
}

/** A component the server marked as not working properly. */
export interface BrokenComponent {
  key: string;
  /** Its name, with the kind for suppliers and gateways: "Rapid IMEI (supplier)". */
  label: string;
  status: 'down' | 'degraded';
}

/**
 * Components whose check is `down` or `degraded`, worst first (the server's order inside each group). Components with no
 * data (`unknown`) are not listed: a disabled supplier is not a failure.
 */
export function brokenComponents(components: readonly HealthComponent[]): BrokenComponent[] {
  const broken = components.filter(
    (component): component is HealthComponent & { status: BrokenComponent['status'] } =>
      component.status === 'down' || component.status === 'degraded',
  );
  return sortProblemsFirst(broken, (component) => component.status).map((component) => ({
    key: component.key,
    label: component.kind === 'core' ? component.name : `${component.name} (${component.kind})`,
    status: component.status,
  }));
}

/**
 * "All 14 components operational", or "13 of 14 components operational" when some have no data. It counts the components
 * the server marked `ok`; it does not judge any of them. Null when the list is empty.
 */
export function operationalText(components: readonly HealthComponent[]): string | null {
  const total = components.length;
  if (total === 0) return null;
  const fine = components.filter((component) => component.status === 'ok').length;
  const noun = total === 1 ? 'component' : 'components';
  if (fine === total) return total === 1 ? '1 component operational' : `All ${total} components operational`;
  return `${fine} of ${total} ${noun} operational`;
}

/** "1 open alert", "3 open alerts". */
export function openAlertsText(count: number): string {
  return `${count} open alert${count === 1 ? '' : 's'}`;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * The open alerts the verdict names: critical first, then warning, then info, each group in the server's order, at most
 * `max`. The rest is a count for "+N more". Only the order is chosen here; the severities are the server's.
 */
export function namedAlerts(
  items: readonly AlertSummary[],
  max = 2,
): { shown: AlertSummary[]; more: number } {
  const ranked = items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.item.severity] ?? 3) - (SEVERITY_ORDER[b.item.severity] ?? 3) || a.index - b.index,
    )
    .map(({ item }) => item);
  return { shown: ranked.slice(0, max), more: Math.max(0, ranked.length - max) };
}

/** "Ledger mismatch (client_wallet:4)", or the rule name alone when the alert has no subject. */
export function alertName(alert: Pick<AlertSummary, 'ruleName' | 'subjectLabel'>): string {
  return alert.subjectLabel ? `${alert.ruleName} (${alert.subjectLabel})` : alert.ruleName;
}

/** The shortcut button of the verdict: where to look next. */
export interface SeeLink {
  to: string;
  label: string;
}

/**
 * "See alerts" when something is open and the staff member may read alerts; otherwise "See incidents" when an incident is
 * ongoing and they may read incidents; otherwise nothing. `can` is the permission hint of the page.
 */
export function seeLink(
  health: Pick<SystemHealth, 'alerts' | 'incidents'>,
  can: (permission: string) => boolean,
): SeeLink | null {
  if ((health.alerts.open.value ?? 0) > 0 && can('alerts:read')) {
    return { to: healthPath('alerts'), label: 'See alerts' };
  }
  if (health.incidents.length > 0 && can('incidents:read')) {
    return { to: healthPath('alerts', { view: 'incidents' }), label: 'See incidents' };
  }
  return null;
}

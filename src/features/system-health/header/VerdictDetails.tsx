// VerdictDetails: the lines under the verdict headline: which components are broken (worst first), which alerts are
// open (critical ones by name) and which incidents are ongoing, and a warning when monitoring is down. Links go to the
// Overview and Alerts tabs when the staff member may read them (docs/system-health-design.md, "Layout").
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ago } from '@/lib/format';
import { useHealthLink, type HealthGrants, type HealthLink } from '../hooks';
import type { SystemHealth } from '../types';
import {
  alertName,
  brokenComponents,
  namedAlerts,
  openAlertsText,
  operationalText,
  verdictLook,
  type BrokenComponent,
} from './verdict';

/** More names than this in one group are folded into "+N more". */
const MAX_NAMES = 4;

/** "Down: Rapid IMEI (supplier), Postgres. Degraded: API." Each name opens that component on the Overview tab. */
function BrokenLine({ broken, link }: { broken: BrokenComponent[]; link: HealthLink }) {
  const groups = (['down', 'degraded'] as const)
    .map((status) => ({ status, items: broken.filter((item) => item.status === status) }))
    .filter((group) => group.items.length > 0);
  return (
    <p>
      {groups.map((group, index) => (
        <Fragment key={group.status}>
          {index > 0 && ' '}
          <span className="font-medium">{group.status === 'down' ? 'Down' : 'Degraded'}:</span>{' '}
          {group.items.slice(0, MAX_NAMES).map((item, position) => (
            <Fragment key={item.key}>
              {position > 0 && ', '}
              <Link className="link" to={link('overview', { component: item.key })}>
                {item.label}
              </Link>
            </Fragment>
          ))}
          {group.items.length > MAX_NAMES && ` +${group.items.length - MAX_NAMES} more`}.
        </Fragment>
      ))}
    </p>
  );
}

/** A link when the staff member may open the target, plain text when not. */
function Maybe({ to, children }: { to: string | null; children: ReactNode }) {
  return to ? (
    <Link className="link" to={to}>
      {children}
    </Link>
  ) : (
    children
  );
}

/**
 * "The count and the names": open alerts with how many are critical, the critical ones by name (or, with none critical,
 * the worst ones), then the ongoing incidents, joined by a dot. An open-alert count of null is "no data", never "none".
 * With nothing open it says so in one quiet sentence.
 */
function AlertsLine({
  health,
  grants,
  link,
}: {
  health: SystemHealth;
  grants: HealthGrants;
  link: HealthLink;
}) {
  const open = health.alerts.open.value;
  const { critical, items } = health.alerts;
  const { incidents } = health;
  const parts: ReactNode[] = [];
  if (open === null) parts.push(<span key="alerts">Open alerts: no data</span>);
  else if (open > 0) {
    // After "1 critical:" only critical alerts are named, so the names never read as critical when they are not.
    const pool = critical > 0 ? items.filter((item) => item.severity === 'critical') : items;
    const { shown, more } = namedAlerts(pool);
    // The summary may list fewer alerts than it counts: the ones it leaves out are "more" too.
    const rest = Math.max(more, (critical > 0 ? critical : open) - shown.length);
    parts.push(
      <span key="alerts">
        <Maybe to={grants.can('alerts:read') ? link('alerts') : null}>{openAlertsText(open)}</Maybe>
        {critical > 0 && `, ${critical} critical`}
        {shown.length > 0 && `: ${shown.map(alertName).join(', ')}`}
        {shown.length > 0 && rest > 0 && ` +${rest} more`}
      </span>,
    );
  }
  if (incidents.length > 0) {
    parts.push(
      <span key="incidents">
        {incidents.length === 1 ? 'Incident' : 'Incidents'}:{' '}
        {incidents.map((incident, position) => (
          <Fragment key={incident.id}>
            {position > 0 && ', '}
            <Maybe
              to={
                grants.can('incidents:read')
                  ? link('alerts', { view: 'incidents', incident: incident.id })
                  : null
              }
            >
              {incident.title}
            </Maybe>
          </Fragment>
        ))}
      </span>,
    );
  }
  if (open === 0 && incidents.length === 0) parts.push(<span key="none">No open alerts or incidents</span>);
  if (parts.length === 0) return null;
  return (
    <p>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && ' · '}
          {part}
        </Fragment>
      ))}
    </p>
  );
}

export interface VerdictDetailsProps {
  health: SystemHealth;
  grants: HealthGrants;
  now: number;
}

/**
 * The monitoring line comes first and is always shown when monitoring is down, whatever the status: nothing fed by it
 * counts as healthy, and the lines below it are read in that light. "All N components operational" only stands under an
 * Operational verdict: under Degraded it would read as an all-clear.
 */
export function VerdictDetails({ health, grants, now }: VerdictDetailsProps) {
  // Links to other tabs keep the chosen range, as a tab change does.
  const link = useHealthLink();
  const broken = brokenComponents(health.components);
  const { monitoring } = health;
  const monitoringDown = monitoring.status === 'unavailable';
  const operational =
    broken.length === 0 && health.status === 'operational' && !monitoringDown
      ? operationalText(health.components)
      : null;
  // When the headline already reads "Monitoring unavailable", the line below only adds the detail.
  const headlineSaysIt = verdictLook(health.status, monitoringDown).word === 'Monitoring unavailable';
  return (
    <>
      {monitoringDown && (
        <p>
          {!headlineSaysIt && <span className="font-medium">Monitoring is unavailable. </span>}
          {monitoring.detail && `${monitoring.detail} `}
          {monitoring.lastScrapeAt && `Last scrape ${ago(monitoring.lastScrapeAt, now)}. `}
          Nothing that depends on it counts as healthy until it answers.
        </p>
      )}
      {broken.length > 0 && <BrokenLine broken={broken} link={link} />}
      {operational && <p>{operational}.</p>}
      <AlertsLine health={health} grants={grants} link={link} />
    </>
  );
}

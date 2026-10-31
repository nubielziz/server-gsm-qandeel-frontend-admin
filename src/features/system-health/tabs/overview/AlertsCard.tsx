// AlertsCard: the third card of the Overview tab: the alerts that are open and the incidents that are ongoing, right now.
// It reads the health summary (`GET /admin/system/health`, route group `health`); each item links into the Alerts tab.
import { useId, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from '@/components/ui';
import { useNow } from '@/lib/format';
import { HealthCard } from '../../components';
import { POLL, useHealthGrants, useHealthLink, useSystemHealth, type HealthGrants } from '../../hooks';
import type { SystemHealth } from '../../types';
import { componentNames, sortAlerts, sortIncidents, unlistedAlerts } from './alertRows';
import { AlertItem } from './AlertItem';
import { IncidentItem } from './IncidentItem';

interface GroupProps {
  title: string;
  /** A hairline above the part, to tell it from the one before. */
  divided?: boolean;
  children: ReactNode;
}

/** A titled part of the card. Parts are told apart by a hairline, not by a box inside the panel. */
function Group({ title, divided = false, children }: GroupProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={divided ? 'mt-3.5 border-t border-line pt-3.5' : undefined}>
      <h3 id={id} className="mb-2 text-xs font-medium text-ink3">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** One quiet sentence, with an icon when it explains a missing figure. */
function Quiet({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <p className="flex items-start gap-2 text-sm text-ink2">
      {icon && <Icon name={icon} className="ic-sm mt-0.5 flex-none text-ink3" />}
      <span>{children}</span>
    </p>
  );
}

interface BodyProps {
  health: SystemHealth;
  grants: HealthGrants;
}

/**
 * An open-alert count of null means the rules cannot be evaluated: that is "no data", not "none open", so the card says
 * so in neutral and never offers the reassuring "No open alerts". The summary may list fewer alerts than it counts; the
 * rest is said, not dropped.
 */
function AlertsBody({ health, grants }: BodyProps) {
  const now = useNow(30_000);
  // The alerts are "right now", but a link is a tab change, and a tab change keeps the range the staff member chose.
  const link = useHealthLink();
  const alerts = useMemo(() => sortAlerts(health.alerts.items), [health.alerts.items]);
  const incidents = useMemo(() => sortIncidents(health.incidents), [health.incidents]);
  const open = health.alerts.open.value;
  const more = unlistedAlerts(open, alerts.length);
  const alertsHref = grants.can('alerts:read') ? link('alerts') : null;
  const moreText = alerts.length === 0 ? `${more} open ${more === 1 ? 'alert' : 'alerts'}` : `+${more} more`;

  return (
    <>
      <Group title="Alerts">
        {alerts.length > 0 && (
          <ul className="m-0 list-none p-0">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} href={alertsHref} now={now} />
            ))}
          </ul>
        )}
        {more > 0 && (
          <p className={alerts.length > 0 ? 'mt-2 text-xs text-ink3' : 'text-sm text-ink2'}>
            {alertsHref ? (
              <Link className="link" to={alertsHref}>
                {moreText}
              </Link>
            ) : (
              moreText
            )}
          </p>
        )}
        {alerts.length === 0 && open === null && (
          <Quiet icon="info">
            <span className="font-medium">No data.</span> The alert rules cannot be evaluated right now. This
            does not mean nothing is open.
          </Quiet>
        )}
        {alerts.length === 0 && open === 0 && <Quiet>No open alerts</Quiet>}
      </Group>
      <Group title="Incidents" divided>
        {incidents.length === 0 ? (
          <Quiet>No ongoing incidents</Quiet>
        ) : (
          <ul className="m-0 list-none p-0">
            {incidents.map((incident) => (
              <IncidentItem
                key={incident.id}
                incident={incident}
                href={
                  grants.can('incidents:read')
                    ? link('alerts', { view: 'incidents', incident: incident.id })
                    : null
                }
                componentNames={componentNames(incident.components, health.components)}
                now={now}
              />
            ))}
          </ul>
        )}
      </Group>
    </>
  );
}

/** "Right now": the range does not apply here, and the card says so under its title. */
export function AlertsCard() {
  const health = useSystemHealth();
  const grants = useHealthGrants();
  return (
    <HealthCard
      title="Open alerts and incidents"
      sub="Right now. The time range does not apply."
      query={health}
      interval={POLL.fast}
      permission="system:read"
      errorTitle="Could not load the open alerts"
    >
      {(data) => <AlertsBody health={data} grants={grants} />}
    </HealthCard>
  );
}

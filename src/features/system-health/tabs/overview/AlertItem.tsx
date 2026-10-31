// AlertItem: one open alert in the Overview tab's alerts card: severity, rule, subject, when it started. The rule name
// links to the Alerts tab when the staff member may read alerts.
import { MetaBadge } from '../../components';
import { alertSeverityMeta, alertStatusMeta } from '../../lib';
import type { AlertSummary } from '../../types';
import { FeedItem } from './FeedItem';
import { WhenText } from './WhenText';

export interface AlertItemProps {
  alert: AlertSummary;
  /** Where the rule name links to, or null when the staff member may not read alerts (plain text then). */
  href: string | null;
  now: number;
}

/**
 * Every alert in this list is open, so "Firing" would repeat on each row; only an acknowledged one says so (someone is on
 * it). The subject is the server's label for what the alert is about, and is left out when it has none.
 */
export function AlertItem({ alert, href, now }: AlertItemProps) {
  return (
    <FeedItem
      severity={<MetaBadge meta={alertSeverityMeta(alert.severity)} />}
      title={alert.ruleName}
      href={href}
      status={
        alert.status === 'acknowledged' ? <MetaBadge meta={alertStatusMeta('acknowledged')} /> : undefined
      }
      facts={[
        alert.subjectLabel && <span className="break-words">{alert.subjectLabel}</span>,
        <WhenText time={alert.startedAt} now={now} label="Started" empty="Start time unknown" />,
      ]}
    />
  );
}

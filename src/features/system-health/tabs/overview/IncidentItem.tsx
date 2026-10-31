// IncidentItem: one ongoing incident in the Overview tab's alerts card: severity, title, status, the components it
// touches and when it started. The title links to the incident in the Alerts tab when the staff member may read incidents.
import { MetaBadge } from '../../components';
import { incidentSeverityMeta, incidentStatusMeta } from '../../lib';
import type { IncidentSummary } from '../../types';
import { FeedItem } from './FeedItem';
import { WhenText } from './WhenText';

export interface IncidentItemProps {
  incident: IncidentSummary;
  /** Where the title links to, or null when the staff member may not read incidents (plain text then). */
  href: string | null;
  /** The names of the incident's components (the keys, where the summary has no name for one). */
  componentNames: readonly string[];
  now: number;
}

/** The status badge says where the incident stands (investigating, identified, monitoring); the severity says how bad. */
export function IncidentItem({ incident, href, componentNames, now }: IncidentItemProps) {
  return (
    <FeedItem
      severity={<MetaBadge meta={incidentSeverityMeta(incident.severity)} />}
      title={incident.title}
      href={href}
      status={<MetaBadge meta={incidentStatusMeta(incident.status)} />}
      facts={[
        componentNames.length > 0 && <span className="break-words">{componentNames.join(', ')}</span>,
        <WhenText time={incident.startedAt} now={now} label="Started" empty="Start time unknown" />,
      ]}
    />
  );
}

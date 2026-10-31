// The cells of the incidents table and the facts of its drawer: the affected components, when it started and how long it ran.
import { Fragment } from 'react';
import { ago, fmtDate } from '@/lib/format';
import type { Incident } from '../../types';
import { incidentDuration } from './incidents';

export interface ComponentListProps {
  keys: readonly string[];
  /** The component's name for a key, or null when the health summary does not know it. */
  nameOf: (key: string) => string | null;
}

/** The affected components by name; a key the summary does not know prints as the server sent it, in mono. */
export function ComponentList({ keys, nameOf }: ComponentListProps) {
  if (keys.length === 0) return <span className="text-ink3">–</span>;
  return (
    <span>
      {keys.map((key, index) => {
        const name = nameOf(key);
        return (
          <Fragment key={key}>
            {index > 0 && ', '}
            {name ?? <span className="mono">{key}</span>}
          </Fragment>
        );
      })}
    </span>
  );
}

/** "28m ago", with the full time on hover. */
export function IncidentStarted({ incident, now }: { incident: Incident; now: number }) {
  if (!incident.startedAt) return <span className="text-ink3">–</span>;
  return (
    <span className="whitespace-nowrap" title={fmtDate(incident.startedAt)}>
      {ago(incident.startedAt, now)}
    </span>
  );
}

/** How long it ran, or "28m so far" while it is not resolved. */
export function IncidentDuration({ incident, now }: { incident: Incident; now: number }) {
  const duration = incidentDuration(incident, now);
  if (!duration) return <span className="text-ink3">–</span>;
  return (
    <span className="whitespace-nowrap tabular-nums">
      {duration.text}
      {duration.ongoing && <span className="text-ink3"> so far</span>}
    </span>
  );
}

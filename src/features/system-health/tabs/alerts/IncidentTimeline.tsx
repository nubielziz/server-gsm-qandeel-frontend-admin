// IncidentTimeline: the lines the server wrote on an incident (declared, updates, closed), oldest first. The node colour
// follows the status; the status word is in the text, so colour is never the only signal.
import { Timeline, type TimelineEvent, type TimelineKind } from '@/components/ui';
import { incidentStatusMeta } from '../../lib';
import type { IncidentStatus, IncidentTimelineEntry } from '../../types';

// The kit's node colours are named for order events; these are the ones that match an incident status.
const KIND: Record<IncidentStatus, TimelineKind> = {
  investigating: 'review',
  identified: 'retry',
  monitoring: 'release',
  resolved: 'completed',
};

/** A status the server sent that we do not know gets the neutral node and its raw word. */
function kindOf(status: string): TimelineKind | undefined {
  return Object.hasOwn(KIND, status) ? KIND[status as IncidentStatus] : undefined;
}

export interface IncidentTimelineProps {
  entries: readonly IncidentTimelineEntry[];
}

/** The kit's `Timeline` fed with the incident's lines: status word first, then the text, then who wrote it. */
export function IncidentTimeline({ entries }: IncidentTimelineProps) {
  const events: TimelineEvent[] = entries.map((entry, index) => ({
    id: index,
    at: entry.at,
    kind: kindOf(entry.status),
    text: (
      <>
        <span className="font-medium">{incidentStatusMeta(entry.status).word}</span> · {entry.text}
      </>
    ),
    by: entry.by?.name ?? 'System',
  }));
  return <Timeline events={events} />;
}

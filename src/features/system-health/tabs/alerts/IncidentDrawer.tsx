// IncidentDrawer: the side sheet of one incident (`?incident=<id>`): summary, facts, root cause, the timeline and the
// actions Post update and Close incident (`GET /admin/incidents/:id`, `PATCH` through the dialogs). No demo page.
import { useState } from 'react';
import { Drawer, EmptyState, ErrorState, KeyValue, SkeletonTable, type KeyValueRow } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { ago, fmtDate, useNow } from '@/lib/format';
import { ActionButton, MetaBadge } from '../../components';
import { useHealthGrants, useIncident } from '../../hooks';
import { incidentSeverityMeta, incidentStatusMeta, isForbiddenError } from '../../lib';
import type { Incident } from '../../types';
import { CloseIncidentDialog } from './CloseIncidentDialog';
import { ComponentList } from './IncidentCells';
import { IncidentTimeline } from './IncidentTimeline';
import { incidentDuration } from './incidents';
import { UpdateIncidentDialog } from './UpdateIncidentDialog';
import { useAffectedComponents } from './useAffectedComponents';

/** What the drawer shows while there is no incident to show: loading, no permission, no such incident, or a failed read. */
function Missing({ query }: { query: ReturnType<typeof useIncident> }) {
  const error = query.isError ? query.error : null;
  if (isForbiddenError(error)) {
    return (
      <EmptyState icon="lock" title="You need the incidents:read permission">
        {(isApiError(error) && error.detail) || 'Ask an administrator to add it to your role.'}
      </EmptyState>
    );
  }
  if (isApiError(error) && error.status === 404) {
    return (
      <EmptyState icon="search" title="Incident not found">
        No incident has this id. It may have been removed.
      </EmptyState>
    );
  }
  if (error) {
    return (
      <ErrorState title="Could not load this incident" error={error} onRetry={() => void query.refetch()} />
    );
  }
  return <SkeletonTable cols={2} rows={6} />;
}

/** The body: the summary, then the facts, the root cause once closed, and the timeline. */
function Details({ incident, now }: { incident: Incident; now: number }) {
  const { nameOf } = useAffectedComponents();
  const duration = incidentDuration(incident, now);
  const rows: KeyValueRow[] = [
    [
      'Started',
      incident.startedAt ? `${fmtDate(incident.startedAt)} (${ago(incident.startedAt, now)})` : '–',
    ],
    ['Declared by', incident.createdBy?.name ?? 'Unknown'],
    ['Affected', <ComponentList key="components" keys={incident.components} nameOf={nameOf} />],
    incident.alertEventId !== null && [
      'From alert',
      <span key="alert" className="mono">
        #{incident.alertEventId}
      </span>,
    ],
    incident.resolvedAt !== null && [
      'Resolved',
      `${fmtDate(incident.resolvedAt)} by ${incident.resolvedBy?.name ?? 'Unknown'}`,
    ],
    duration && ['Duration', `${duration.text}${duration.ongoing ? ' so far' : ''}`],
  ];
  return (
    <div className="space-y-5">
      <section>
        <h3 className="label">Summary</h3>
        <p className="text-sm">{incident.summary}</p>
      </section>
      <KeyValue rows={rows} />
      {incident.rootCause && (
        <section>
          <h3 className="label">Root cause</h3>
          <p className="text-sm">{incident.rootCause}</p>
        </section>
      )}
      <section>
        <h3 className="label">Timeline</h3>
        <IncidentTimeline entries={incident.timeline} />
      </section>
    </div>
  );
}

export interface IncidentDrawerProps {
  id: number;
  onClose: () => void;
}

/**
 * Reads the incident again (it polls, and an update refreshes it), so the timeline stays current under the open drawer. A
 * closed incident is a record: its footer is gone. A read-only staff member has no footer either.
 */
export function IncidentDrawer({ id, onClose }: IncidentDrawerProps) {
  const query = useIncident(id);
  const grants = useHealthGrants();
  const now = useNow();
  const [dialog, setDialog] = useState<'update' | 'close' | null>(null);
  const incident = query.data;

  if (!incident) {
    return (
      <Drawer open onClose={onClose} title={`Incident #${id}`}>
        <Missing query={query} />
      </Drawer>
    );
  }
  const canAct = grants.ready && !grants.readOnly && incident.status !== 'resolved';
  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={incident.title}
        sub={`Incident #${incident.id}`}
        badges={
          <>
            <MetaBadge meta={incidentSeverityMeta(incident.severity)} />
            <MetaBadge meta={incidentStatusMeta(incident.status)} />
          </>
        }
        footer={
          canAct ? (
            <>
              <ActionButton
                permission="incidents:update"
                variant="primary"
                onClick={() => setDialog('update')}
              >
                Post update
              </ActionButton>
              <ActionButton permission="incidents:update" onClick={() => setDialog('close')}>
                Close incident
              </ActionButton>
            </>
          ) : undefined
        }
      >
        <Details incident={incident} now={now} />
      </Drawer>
      {dialog === 'update' && <UpdateIncidentDialog incident={incident} onClose={() => setDialog(null)} />}
      {dialog === 'close' && <CloseIncidentDialog incident={incident} onClose={() => setDialog(null)} />}
    </>
  );
}

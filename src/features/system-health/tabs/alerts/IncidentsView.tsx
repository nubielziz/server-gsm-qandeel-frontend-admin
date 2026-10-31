// IncidentsView: the "Incidents" view of the Alerts & incidents tab, the incidents staff have declared (`/admin/incidents`),
// with Declare incident and the drawer of one incident (`?incident=<id>`). Ongoing incidents first; resolved ones are one
// click away.
import { useState } from 'react';
import { EmptyState, Icon, SegmentedControl, SkeletonTable, usePageClamp } from '@/components/ui';
import { ActionButton, HealthCard } from '../../components';
import { PAGE_SIZE, POLL, useIncidents } from '../../hooks';
import { pageRange } from './alertsView';
import { DeclareIncidentDialog } from './DeclareIncidentDialog';
import { IncidentDrawer } from './IncidentDrawer';
import { IncidentsTable } from './IncidentsTable';
import {
  DEFAULT_INCIDENT_CHOICE,
  INCIDENT_CHOICES,
  incidentFilters,
  parseIncidentChoice,
  type IncidentChoice,
} from './incidents';
import { useStatusParam } from './useListParams';

// What an empty list says for each filter choice: what it would hold, and where the other incidents are.
const EMPTY: Record<IncidentChoice, { title: string; text: string }> = {
  ongoing: {
    title: 'No ongoing incidents',
    text: 'Declare one when something is wrong that customers or orders feel. Resolved incidents are under Resolved.',
  },
  resolved: { title: 'No resolved incidents yet', text: 'Closed incidents stay here as a record.' },
  all: { title: 'No incidents yet', text: 'Declared incidents appear here, newest first.' },
};

/** The line under the title. For "Ongoing" it is the quiet line that says what is hidden, with the way to show it. */
function Sub({ choice, onShowAll }: { choice: IncidentChoice; onShowAll: () => void }) {
  if (choice !== 'ongoing') return <>Newest first.</>;
  return (
    <>
      Ongoing incidents, newest first. Resolved incidents are hidden ·{' '}
      <button type="button" className="link" aria-label="Show resolved incidents" onClick={onShowAll}>
        Show
      </button>
    </>
  );
}

export interface IncidentsViewProps {
  /** The incident whose drawer is open (`?incident=`), or null. */
  openId: number | null;
  onOpen: (id: number) => void;
  onClose: () => void;
}

/** One card around the incidents read. The filter and Declare incident live in its header, so they survive an empty list. */
export function IncidentsView({ openId, onOpen, onClose }: IncidentsViewProps) {
  const {
    status: choice,
    setStatus,
    page,
    setPage,
  } = useStatusParam(parseIncidentChoice, DEFAULT_INCIDENT_CHOICE);
  const query = useIncidents(incidentFilters(choice), pageRange(page, PAGE_SIZE));
  const [declaring, setDeclaring] = useState(false);
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total: query.data?.total,
    settled: !query.isPlaceholderData,
    setPage,
  });

  return (
    <>
      <HealthCard
        title="Incidents"
        sub={<Sub choice={choice} onShowAll={() => setStatus('all')} />}
        right={
          <>
            <SegmentedControl
              items={INCIDENT_CHOICES}
              value={choice}
              onChange={setStatus}
              label="Incident status"
            />
            <ActionButton permission="incidents:create" variant="primary" onClick={() => setDeclaring(true)}>
              <Icon name="plus" className="ic-sm" />
              Declare incident
            </ActionButton>
          </>
        }
        query={query}
        interval={POLL.normal}
        skeleton={<SkeletonTable cols={5} rows={4} />}
        errorTitle="Could not load the incidents"
        permission="incidents:read"
        flush
      >
        {(data) => (
          <IncidentsTable
            rows={data.data}
            total={data.total}
            page={page}
            onPageChange={setPage}
            empty={
              <EmptyState icon="shield" title={EMPTY[choice].title}>
                {EMPTY[choice].text}
              </EmptyState>
            }
            onOpen={(incident) => onOpen(incident.id)}
          />
        )}
      </HealthCard>
      {declaring && <DeclareIncidentDialog onClose={() => setDeclaring(false)} />}
      {openId !== null && <IncidentDrawer id={openId} onClose={onClose} />}
    </>
  );
}

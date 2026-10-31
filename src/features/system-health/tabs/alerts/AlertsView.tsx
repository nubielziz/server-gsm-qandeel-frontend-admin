// AlertsView: the "Alerts" view of the Alerts & incidents tab, the alerts the server's rules have fired (`GET /admin/alerts`).
// Problems first: it opens on the open ones (firing, then acknowledged); resolved alerts are one click away.
import { useState } from 'react';
import { EmptyState, SegmentedControl, SkeletonTable, usePageClamp } from '@/components/ui';
import { HealthCard } from '../../components';
import { PAGE_SIZE, POLL } from '../../hooks';
import type { AlertEvent } from '../../types';
import { AckAlertDialog } from './AckAlertDialog';
import { AlertsTable } from './AlertsTable';
import {
  ALERT_CHOICES,
  DEFAULT_ALERT_CHOICE,
  emptyText,
  emptyTitle,
  parseAlertChoice,
  type AlertChoice,
} from './alertFilter';
import { DeclareIncidentDialog } from './DeclareIncidentDialog';
import { MonitoringNote } from './MonitoringNote';
import { useMonitoringBlind } from './useMonitoringBlind';
import { useAlertList } from './useAlertList';
import { useStatusParam } from './useListParams';

type DialogState = { kind: 'acknowledge' | 'declare'; alert: AlertEvent } | null;

/** The line under the title. For "Open" it is the quiet line that says what is hidden, with the way to show it. */
function Sub({ choice, onShowAll }: { choice: AlertChoice; onShowAll: () => void }) {
  if (choice !== 'open') return <>Newest first.</>;
  return (
    <>
      Firing alerts first, then acknowledged ones. Resolved alerts are hidden ·{' '}
      <button type="button" className="link" aria-label="Show resolved alerts" onClick={onShowAll}>
        Show
      </button>
    </>
  );
}

/**
 * One card around the alerts read (`HealthCard`: loading, error with Retry, stale, forbidden). The filter lives in the card's
 * header, so it stays reachable when a filter has no rows or the read failed. The dialogs open from the rows. While
 * monitoring is down the note sits above the rows; an empty list says the same in its own empty state, so it has no note.
 */
export function AlertsView() {
  const { status: choice, setStatus, page, setPage } = useStatusParam(parseAlertChoice, DEFAULT_ALERT_CHOICE);
  const { query, settled } = useAlertList(choice, page);
  const [dialog, setDialog] = useState<DialogState>(null);
  const blind = useMonitoringBlind();
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total: query.data?.total,
    settled: settled && choice !== 'open',
    setPage,
  });

  return (
    <>
      <HealthCard
        title="Alerts"
        sub={<Sub choice={choice} onShowAll={() => setStatus('all')} />}
        right={
          <SegmentedControl items={ALERT_CHOICES} value={choice} onChange={setStatus} label="Alert status" />
        }
        query={query}
        interval={POLL.fast}
        skeleton={<SkeletonTable cols={6} rows={4} />}
        errorTitle="Could not load the alerts"
        permission="alerts:read"
        flush
      >
        {(data) => (
          <>
            {blind && data.data.length > 0 && <MonitoringNote />}
            {data.capped && (
              <p className="border-b border-line px-3.5 py-2 text-xs text-ink3">
                There are {data.total} open alerts; the newest of each kind are listed. Use Firing or
                Acknowledged to page through all of them.
              </p>
            )}
            <AlertsTable
              rows={data.data}
              total={data.total}
              paging={choice === 'open' ? undefined : { page, onPageChange: setPage }}
              empty={
                <EmptyState icon="bell" title={emptyTitle(choice, blind)}>
                  {emptyText(choice, blind)}
                </EmptyState>
              }
              onAcknowledge={(alert) => setDialog({ kind: 'acknowledge', alert })}
              onDeclare={(alert) => setDialog({ kind: 'declare', alert })}
            />
          </>
        )}
      </HealthCard>
      {dialog?.kind === 'acknowledge' && (
        <AckAlertDialog alert={dialog.alert} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'declare' && (
        <DeclareIncidentDialog alert={dialog.alert} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

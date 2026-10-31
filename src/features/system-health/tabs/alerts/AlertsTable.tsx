// AlertsTable: the fired alerts as a table from `md` up and as cards below (ResponsiveTable). Declare incident and
// Acknowledge sit in the last column, at the foot of each card.
import type { ReactNode } from 'react';
import type { DataTableColumn } from '@/components/ui';
import { useNow } from '@/lib/format';
import { ActionButton, MetaBadge, ResponsiveTable } from '../../components';
import { PAGE_SIZE, useHealthGrants } from '../../hooks';
import { alertSeverityMeta } from '../../lib';
import type { AlertEvent } from '../../types';
import { AckCell, RuleCell, StartedCell, StatusCell, SubjectCell } from './AlertCells';
import { acknowledgedBy, conditionText } from './condition';
import { RowActions } from './RowActions';

export interface AlertsTableProps {
  rows: readonly AlertEvent[];
  total: number;
  /** Page controls. Left out when the list is not paged (the "Open" choice). */
  paging?: { page: number; onPageChange: (page: number) => void };
  /** What an empty list says; it names the filter. */
  empty: ReactNode;
  onAcknowledge: (alert: AlertEvent) => void;
  onDeclare: (alert: AlertEvent) => void;
}

/**
 * Only a firing alert can be acknowledged (the server refuses the others), and only an open one can start an incident, or
 * one that has none yet. These are hints to save a click that would fail; the server decides. The permission hint is the
 * button's own. Acknowledge comes last so it is always the right-most button, whether or not Declare incident is shown.
 */
export function AlertsTable({ rows, total, paging, empty, onAcknowledge, onDeclare }: AlertsTableProps) {
  const now = useNow();
  const grants = useHealthGrants();
  const canReadIncidents = grants.can('incidents:read');

  const columns: DataTableColumn<AlertEvent>[] = [
    { key: 'rule', label: 'Alert', render: (alert) => <RuleCell alert={alert} /> },
    {
      key: 'severity',
      label: 'Severity',
      render: (alert) => <MetaBadge meta={alertSeverityMeta(alert.severity)} />,
    },
    { key: 'subject', label: 'Subject', render: (alert) => <SubjectCell alert={alert} /> },
    {
      key: 'condition',
      label: 'Condition',
      // It may wrap at the spaces in a narrow panel, so the table fits; from a 1,400px window it stays on one line.
      render: (alert) => (
        <span className="tabular-nums min-[1400px]:whitespace-nowrap">
          {conditionText(alert.value, alert.rule)}
        </span>
      ),
    },
    { key: 'started', label: 'Started', render: (alert) => <StartedCell alert={alert} now={now} /> },
    {
      key: 'status',
      label: 'Status',
      render: (alert) => <StatusCell alert={alert} now={now} canReadIncidents={canReadIncidents} />,
    },
    {
      key: 'ack',
      label: 'Acknowledged by',
      // A column of its own only from 2xl; below that the Status cell carries the same lines (`StatusCell`).
      className: 'hidden 2xl:table-cell',
      render: (alert) => (acknowledgedBy(alert) ? <AckCell alert={alert} now={now} /> : null),
    },
    {
      key: 'actions',
      label: '',
      render: (alert) => (
        <RowActions>
          {alert.status !== 'resolved' && alert.incidentId === null && (
            <ActionButton permission="incidents:create" size="sm" onClick={() => onDeclare(alert)}>
              Declare incident
            </ActionButton>
          )}
          {alert.status === 'firing' && (
            <ActionButton permission="alerts:update" size="sm" onClick={() => onAcknowledge(alert)}>
              Acknowledge
            </ActionButton>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <ResponsiveTable
      caption="Alerts"
      columns={columns}
      rows={rows}
      rowKey={(alert) => alert.id}
      empty={empty}
      pagination={paging ? { page: paging.page, pageSize: PAGE_SIZE, total } : undefined}
      onPageChange={paging?.onPageChange}
    />
  );
}

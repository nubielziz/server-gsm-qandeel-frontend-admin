// IncidentsTable: the incidents as a table from `md` up and as cards below (ResponsiveTable). The title opens the drawer;
// the row click does too, for the mouse.
import type { ReactNode } from 'react';
import type { DataTableColumn } from '@/components/ui';
import { useNow } from '@/lib/format';
import { MetaBadge, ResponsiveTable } from '../../components';
import { PAGE_SIZE } from '../../hooks';
import { incidentSeverityMeta, incidentStatusMeta } from '../../lib';
import type { Incident } from '../../types';
import { ComponentList, IncidentDuration, IncidentStarted } from './IncidentCells';
import { useAffectedComponents } from './useAffectedComponents';

export interface IncidentsTableProps {
  rows: readonly Incident[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  onOpen: (incident: Incident) => void;
}

/**
 * Rows are mouse targets only (the kit's rule), so the title is a button: the keyboard path to the drawer. Components show
 * by name when the health summary is readable, as keys otherwise.
 */
export function IncidentsTable({ rows, total, page, onPageChange, empty, onOpen }: IncidentsTableProps) {
  const now = useNow();
  const { nameOf } = useAffectedComponents();

  const columns: DataTableColumn<Incident>[] = [
    {
      key: 'title',
      label: 'Incident',
      render: (incident) => (
        <button type="button" className="link text-start font-medium" onClick={() => onOpen(incident)}>
          {incident.title}
        </button>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (incident) => <MetaBadge meta={incidentSeverityMeta(incident.severity)} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (incident) => <MetaBadge meta={incidentStatusMeta(incident.status)} />,
    },
    {
      key: 'components',
      label: 'Components',
      hide: 'lg',
      render: (incident) => <ComponentList keys={incident.components} nameOf={nameOf} />,
    },
    {
      key: 'started',
      label: 'Started',
      render: (incident) => <IncidentStarted incident={incident} now={now} />,
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (incident) => <IncidentDuration incident={incident} now={now} />,
    },
  ];

  return (
    <ResponsiveTable
      caption="Incidents"
      columns={columns}
      rows={rows}
      rowKey={(incident) => incident.id}
      empty={empty}
      onRowClick={onOpen}
      pagination={{ page, pageSize: PAGE_SIZE, total }}
      onPageChange={onPageChange}
    />
  );
}

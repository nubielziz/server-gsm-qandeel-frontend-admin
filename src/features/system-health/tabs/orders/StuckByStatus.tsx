// StuckByStatus: the "past SLA by status" table of the Order pipeline card (status, orders, oldest, money held). Each row
// opens the Orders page filtered to orders past SLA when the staff member may read orders. Orders & suppliers tab.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import type { DataTableColumn } from '@/components/ui';
import { ageText, money, num } from '@/lib/format';
import { ResponsiveTable } from '../../components';
import { useHealthGrants } from '../../hooks';
import type { Measure, StuckStatusRow } from '../../types';
import { pastSlaPath } from './links';

export interface StuckByStatusProps {
  /** One row per order status that has orders past SLA, as the server sent them. */
  rows: readonly StuckStatusRow[];
  /** The server's total, to say why the table is empty: none past SLA, or no data. */
  total: Measure;
}

/** Without rows the table is replaced by one quiet line. A total of zero is a real "none"; anything else is "no data". */
function NoRows({ total }: { total: Measure }) {
  return (
    <p className="px-3.5 pb-3.5 text-sm text-ink2">
      {total.value === 0 ? 'No orders are past SLA.' : 'No split by status is available.'}
    </p>
  );
}

/**
 * Rows are sorted as the server sent them. The status word is a real link (keyboard, screen reader) and the rest of the row
 * is a mouse target for the same address. Without `orders:read` the status is plain text and the row does nothing.
 */
export function StuckByStatus({ rows, total }: StuckByStatusProps) {
  const grants = useHealthGrants();
  const navigate = useNavigate();
  const canOpen = grants.can('orders:read');
  const columns = useMemo<DataTableColumn<StuckStatusRow>[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        render: (row) =>
          canOpen ? (
            <Link
              className="link"
              to={pastSlaPath(row.status)}
              title={`Show the orders past SLA in ${row.label}`}
            >
              {row.label}
            </Link>
          ) : (
            row.label
          ),
      },
      { key: 'count', label: 'Orders', num: true, render: (row) => num(row.count) },
      {
        key: 'oldest',
        label: 'Oldest',
        num: true,
        render: (row) =>
          row.oldestAgeSeconds === null ? (
            <span className="text-ink3">No data</span>
          ) : (
            ageText(row.oldestAgeSeconds * 1000)
          ),
      },
      { key: 'held', label: 'Held', num: true, render: (row) => money(row.heldAmount) },
    ],
    [canOpen],
  );
  if (rows.length === 0) return <NoRows total={total} />;
  return (
    <ResponsiveTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.status}
      caption="Orders past SLA by status"
      onRowClick={canOpen ? (row) => void navigate(pastSlaPath(row.status)) : undefined}
      footer={false}
    />
  );
}

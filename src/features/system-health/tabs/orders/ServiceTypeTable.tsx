// ServiceTypeTable: how finished orders ended per service type over the last 24 hours (orders, success, failure) in the
// Order pipeline card. A small table on purpose, not a chart. Orders & suppliers tab, `GET /admin/system/orders-health`.
import { useMemo } from 'react';
import type { DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { MeasureValue, ResponsiveTable } from '../../components';
import type { ServiceTypeHealth } from '../../types';
import { serviceTypeLabel, sortServiceTypes } from './pipelineModel';

// The type first (it is the card heading on a phone), then the finished orders and how they ended.
const COLUMNS: DataTableColumn<ServiceTypeHealth>[] = [
  { key: 'type', label: 'Type', render: (row) => serviceTypeLabel(row.type) },
  { key: 'total', label: 'Orders', num: true, render: (row) => num(row.total) },
  {
    key: 'success',
    label: 'Success',
    num: true,
    render: (row) => <MeasureValue measure={row.success} reserveIcon />,
  },
  {
    key: 'failure',
    label: 'Failure',
    num: true,
    render: (row) => <MeasureValue measure={row.failure} reserveIcon />,
  },
];

/** Service types with a problem come first (by the server's state), so a failing type is the top row. */
export function ServiceTypeTable({ rows }: { rows: readonly ServiceTypeHealth[] }) {
  const sorted = useMemo(() => sortServiceTypes(rows), [rows]);
  if (sorted.length === 0)
    return <p className="px-3.5 pb-3.5 text-sm text-ink2">No orders finished in the last 24 hours.</p>;
  return (
    <ResponsiveTable
      columns={COLUMNS}
      rows={sorted}
      rowKey={(row) => row.type}
      caption="Finished orders by service type, last 24 hours"
      footer={false}
    />
  );
}

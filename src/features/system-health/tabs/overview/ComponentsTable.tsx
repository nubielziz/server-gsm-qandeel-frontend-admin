// ComponentsTable: the rows of the Overview tab's components list as a table, or as cards on a phone (ResponsiveTable).
import { useMemo } from 'react';
import { useNow } from '@/lib/format';
import { ResponsiveTable } from '../../components';
import { RANGE_LABEL, useCompactScreen } from '../../lib';
import type { HealthComponent, TimeRange } from '../../types';
import { componentColumns } from './componentColumns';
import type { HistoryView } from './history';

export interface ComponentsTableProps {
  rows: readonly HealthComponent[];
  history: HistoryView;
  range: TimeRange;
  /** Key of the component the chart shows. */
  picked: string | null;
  onPick: (key: string) => void;
  canOpenSupplier: boolean;
}

/**
 * The rows arrive in the order to show (problems first). A click on the empty part of a row picks it for the chart, the
 * same as the button in its name cell, which is the keyboard path. No "N rows" line: the quiet "11 components
 * operational" line under the table already counts.
 */
export function ComponentsTable({
  rows,
  history,
  range,
  picked,
  onPick,
  canOpenSupplier,
}: ComponentsTableProps) {
  const now = useNow(30_000);
  // The same query ResponsiveTable asks, so the columns and the layout always agree.
  const compact = useCompactScreen();
  const historyLabel = RANGE_LABEL[range];
  const columns = useMemo(
    () => componentColumns({ now, historyLabel, history, picked, onPick, canOpenSupplier, compact }),
    [now, historyLabel, history, picked, onPick, canOpenSupplier, compact],
  );
  return (
    <ResponsiveTable
      columns={columns}
      rows={rows}
      rowKey={(component) => component.key}
      onRowClick={(component) => onPick(component.key)}
      caption="Components"
      cardTitle="component"
      footer={false}
    />
  );
}

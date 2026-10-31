// SuppliersCard: the Suppliers card of the Orders & suppliers tab: supplier health with the problems first, the healthy ones
// behind one quiet line, and Pause and Resume. One HealthCard around `GET /admin/system/suppliers`.
import { useMemo, useState } from 'react';
import { SkeletonTable } from '@/components/ui';
import { useNow } from '@/lib/format';
import { HealthCard, type HealthQuery, QuietLine } from '../../components';
import { POLL } from '../../hooks';
import type { SupplierHealth, SuppliersHealth } from '../../types';
import { SupplierStatusDialog } from './SupplierStatusDialog';
import { SupplierTable } from './SupplierTable';
import { groupSuppliers, quietText, suppliersSummary, type StatusChange } from './suppliersModel';

/**
 * The table lists the suppliers that need a look. The quiet line under it stands for the rest; "Show" adds them to the same
 * table, below the problems, so the columns stay in line and the header is not repeated. The dialog lives here, once, and
 * is opened by the Pause or Resume button of any row.
 */
function SuppliersBody({ suppliers }: { suppliers: readonly SupplierHealth[] }) {
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState<StatusChange | null>(null);
  const now = useNow(30_000);
  const groups = useMemo(() => groupSuppliers(suppliers), [suppliers]);
  const rows = open ? groups.all : groups.attention;
  return (
    <>
      {rows.length > 0 && (
        <SupplierTable
          rows={rows}
          caption={open ? 'All suppliers' : 'Suppliers that need attention'}
          now={now}
          onChange={setChange}
        />
      )}
      {groups.quiet.length > 0 && (
        <QuietLine
          text={quietText(groups)}
          what="the healthy suppliers"
          open={open}
          onToggle={() => setOpen((value) => !value)}
          divided={rows.length > 0}
        />
      )}
      {change && <SupplierStatusDialog change={change} onClose={() => setChange(null)} />}
    </>
  );
}

const NEUTRAL_SUB = 'Health of each supplier connection, problems first.';

export interface SuppliersCardProps {
  /** The read of `GET /admin/system/suppliers`; the tab owns it so it can reset the card's boundary. */
  query: HealthQuery<SuppliersHealth>;
}

/**
 * The sub line counts the suppliers that need a look, so the card answers "is a supplier broken?" before any row is read.
 * With no supplier at all it keeps the neutral line: "0 suppliers · none need attention" above the "No data" empty state
 * would say two things at once.
 */
export function SuppliersCard({ query }: SuppliersCardProps) {
  const list = query.data?.suppliers;
  const sub = list && list.length > 0 ? suppliersSummary(groupSuppliers(list)) : NEUTRAL_SUB;
  return (
    <HealthCard
      title="Suppliers"
      sub={sub}
      query={query}
      interval={POLL.normal}
      errorTitle="Could not load the suppliers"
      permission="system:read"
      isEmpty={(data) => data.suppliers.length === 0}
      emptyText="Suppliers appear here once they are connected on the Suppliers page."
      skeleton={<SkeletonTable cols={6} rows={3} />}
      flush
    >
      {(data) => <SuppliersBody suppliers={data.suppliers} />}
    </HealthCard>
  );
}

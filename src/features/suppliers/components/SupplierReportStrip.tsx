// SupplierReportStrip: one line under the stats with what the supplier report says about the last 7 days: orders sent, what
// they cost, how many were rejected and how fast the supplier was. The demo has no such line; the map adds the report
// (`GET /admin/reports/suppliers`, needs `reports:read`), so the page draws it only for staff who can read reports.
import { Skeleton } from '@/components/ui';
import { dur, money } from '@/lib/format';
import { pct } from '@/lib/format';
import { REPORT_DAYS } from '../hooks/useSupplierReport';
import type { SupplierReportRow } from '../types';

export interface SupplierReportStripProps {
  row: SupplierReportRow | undefined;
  loading: boolean;
  /** The server's words when the report could not be read. */
  error: string | null;
}

/** The report line: a skeleton while loading, the server's error if it failed, nothing when the supplier has no row. */
export function SupplierReportStrip({ row, loading, error }: SupplierReportStripProps) {
  if (loading) {
    return (
      <div className="border-b border-line px-3.5 py-2.5">
        <Skeleton width={320} height={10} />
      </div>
    );
  }
  if (error) {
    return (
      <p className="border-b border-line px-3.5 py-2 text-xs text-ink3">
        Supplier report unavailable: {error}
      </p>
    );
  }
  if (!row) return null;
  const facts = [
    `${row.orders} ${row.orders === 1 ? 'order' : 'orders'}`,
    `${money(row.spend)} spent`,
    row.rejectionRate !== null && `${pct(row.rejectionRate, 1)} rejected`,
    row.averageSeconds !== null && `${dur(row.averageSeconds * 1000)} average`,
  ].filter(Boolean);
  return (
    <p className="border-b border-line px-3.5 py-2 text-xs text-ink3" aria-label="Supplier report">
      <span className="font-medium text-ink2">Last {REPORT_DAYS} days</span> · {facts.join(' · ')}
    </p>
  );
}

// SupplierDetailPanel: the right-hand side of the page: the selected supplier's header, banner, stats, charts, services,
// connection and API log. Ports `supDetail` of 44-p-suppliers.js. The header and stats draw from the list row at once; the
// charts and the services table wait for the supplier's detail read, and the report line for `reports:read`.
import { errorText } from '@/components/ui';
import { useOrderDrawer } from '@/features/orders';
import type { SupplierGrants } from '../hooks/useSupplierGrants';
import { useSetSupplierEnabled, useSyncSupplier, useTestSupplier } from '../hooks/useSupplierMutations';
import { useSupplierDetail } from '../hooks/useSupplierDetail';
import { useSupplierReport } from '../hooks/useSupplierReport';
import { needsAttention } from '../lib/state';
import type { Supplier } from '../types';
import { ApiLogPanel } from './ApiLogPanel';
import { SupplierBanner } from './SupplierBanner';
import { SupplierCharts } from './SupplierCharts';
import { SupplierChartsSkeleton } from './SupplierChartsSkeleton';
import { SupplierConnection } from './SupplierConnection';
import { SupplierHead } from './SupplierHead';
import { SupplierReportStrip } from './SupplierReportStrip';
import { SupplierServices } from './SupplierServices';
import { SupplierStats } from './SupplierStats';
import type { SupplierDialogState } from './supplierDialogState';

export interface SupplierDetailPanelProps {
  /** The supplier as the list has it. */
  row: Supplier;
  grants: SupplierGrants;
  onDialog: (dialog: SupplierDialogState) => void;
}

/** Everything about the selected supplier. It starts the detail read, the report read and the test and sync actions. */
export function SupplierDetailPanel({ row, grants, onDialog }: SupplierDetailPanelProps) {
  const { detail, query } = useSupplierDetail(row.id);
  // The header and the stats read the list row, so they always agree with the list on the left; the detail read adds the
  // history and the linked services.
  const supplier = row;
  const canReport = grants.can('reports:read');
  const report = useSupplierReport(canReport);
  const test = useTestSupplier();
  const sync = useSyncSupplier();
  const enable = useSetSupplierEnabled({ toastErrors: true });
  const orderDrawer = useOrderDrawer();
  const bad = needsAttention(supplier);
  const rerouting = bad && supplier.openOrders > 0;

  return (
    <section className="panel" id="sup-detail" aria-label={`${supplier.name} details`}>
      <SupplierHead
        supplier={supplier}
        grants={grants}
        links={detail?.links}
        bannerPrimary={rerouting}
        testing={test.isPending}
        syncing={sync.isPending}
        onTest={() => test.mutate(supplier)}
        onSync={() => sync.mutate(supplier)}
        onEnable={(target) => enable.mutate({ supplier: target, enabled: true })}
        onDialog={onDialog}
      />
      {bad && (
        <SupplierBanner
          supplier={supplier}
          grants={grants}
          onReroute={() => onDialog({ kind: 'reroute', supplier })}
        />
      )}
      <SupplierStats supplier={supplier} canOpenOrders={grants.can('orders:read')} />
      {canReport && (
        <SupplierReportStrip
          row={report.data?.find((candidate) => candidate.supplierId === supplier.id)}
          loading={report.isLoading}
          error={report.isError ? errorText(report.error) : null}
        />
      )}
      {detail ? (
        <SupplierCharts name={supplier.name} history={detail.history} />
      ) : (
        !query.isError && <SupplierChartsSkeleton />
      )}
      <div className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SupplierServices
          supplier={supplier}
          links={detail?.links}
          failed={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          grants={grants}
          onImport={() => onDialog({ kind: 'import', supplier })}
          onEditLinks={(link) => onDialog({ kind: 'links', supplier, link })}
        />
        <SupplierConnection supplier={supplier} />
      </div>
      <ApiLogPanel
        supplier={supplier}
        onOpenOrder={grants.can('orders:read') ? orderDrawer.open : undefined}
      />
    </section>
  );
}

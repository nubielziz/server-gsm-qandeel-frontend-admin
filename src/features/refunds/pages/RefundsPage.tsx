// RefundsPage: "Refunds & disputes" (`/refunds`, the demo's `pageRefunds` in 53-p-refunds.js). A header, the figures strip and
// three tabs kept in the address (`?tab=`): Refunds, Card disputes and Payments. A tab the staff member may not read is hidden.
// The page only composes; each tab owns its data and dialogs, and the order drawer opens in place (`?order=<id>`).
import { EmptyState, PageHeader, Panel, SkeletonTable, Tabs, type TabItem } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { DisputesTab } from '../components/DisputesTab';
import { PaymentsTab } from '../components/PaymentsTab';
import { RefundStrip } from '../components/RefundStrip';
import { RefundsTab } from '../components/RefundsTab';
import { useOrderOpener } from '../hooks/useOrderOpener';
import { useRefundFigures } from '../hooks/useRefundFigures';
import { useRefundGrants } from '../hooks/useRefundGrants';
import { useRefundView } from '../hooks/useRefundView';
import { REFUND_TABS, type RefundTab } from '../lib/view';

export function RefundsPage() {
  const grants = useRefundGrants();
  const { view, setTab } = useRefundView();
  const figures = useRefundFigures(grants.can, grants.ready);
  const opener = useOrderOpener();
  // The order links and the drawer need the right to read orders; without it the numbers are plain text.
  const canReadOrders = grants.can('orders:read');
  const openOrder = canReadOrders ? opener : undefined;

  const visible = REFUND_TABS.filter((tab) => grants.can(tab.permission));
  // An unknown or forbidden `?tab=` falls back to the first tab the staff member may open.
  const current = visible.find((tab) => tab.id === view.tab) ?? visible[0];

  // The chips count what waits for a person: refunds to decide or retry, disputes that need evidence. Zero shows nothing.
  const waiting =
    figures.requested !== undefined && figures.failed !== undefined
      ? figures.requested + figures.failed
      : undefined;
  const chips: Record<RefundTab, number | undefined> = {
    refunds: waiting,
    disputes: figures.needsResponse,
    payments: undefined,
  };
  const items: TabItem<RefundTab>[] = visible.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: chips[tab.id] || null,
  }));

  return (
    <>
      <PageHeader
        title="Refunds & disputes"
        sub="Money going back to storefront customers, and the bank claims that try to take it back."
      />
      {!grants.ready ? (
        <Panel flush>
          <SkeletonTable cols={6} rows={6} />
        </Panel>
      ) : !current ? (
        <Panel flush>
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot see refunds, card disputes or payment reports. Ask an owner if you need access.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <RefundStrip figures={figures} can={grants.can} />
          <div className="mb-4">
            <Tabs items={items} value={current.id} onChange={setTab} label="Refund sections" />
          </div>
          <div role="tabpanel" aria-label={current.label}>
            {current.id === 'refunds' && <RefundsTab grants={grants} onOpenOrder={openOrder} />}
            {current.id === 'disputes' && <DisputesTab grants={grants} onOpenOrder={openOrder} />}
            {current.id === 'payments' && <PaymentsTab grants={grants} onOpenOrder={openOrder} />}
          </div>
        </>
      )}
      {canReadOrders && <OrderDrawerHost />}
    </>
  );
}

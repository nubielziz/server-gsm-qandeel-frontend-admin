// RiskPage: "Risk & checks" (`/risk`, the demo's `pageRisk` in 54-p-risk.js). Four tabs kept in the address (`?tab=`): the
// review queue of held orders, the IMEI check log, the blocklist and the rules. The page only composes; each tab loads its own
// data. The order drawer (`?order=<id>`) opens in place from any order number on the page. `modeGate` of the demo is dropped.
import { PageHeader, Tabs, type TabItem } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { BlocklistTab } from '../components/BlocklistTab';
import { ChecksTab } from '../components/ChecksTab';
import { QueueTab } from '../components/QueueTab';
import { RulesTab } from '../components/RulesTab';
import { useBlocklistCount } from '../hooks/useBlocklist';
import { useRiskGrants } from '../hooks/useRiskGrants';
import { useRiskQueue } from '../hooks/useRiskQueue';
import { useRiskView } from '../hooks/useRiskView';
import { RISK_TABS, type RiskTab } from '../lib/view';

export function RiskPage() {
  const grants = useRiskGrants();
  const view = useRiskView();
  const queue = useRiskQueue();
  const blocked = useBlocklistCount();

  // The demo shows a count on the queue only when something is held, and always on the blocklist.
  const counts: Partial<Record<RiskTab, number | null>> = {
    queue: queue.data?.held.length || null,
    block: blocked.data,
  };
  const items: TabItem<RiskTab>[] = RISK_TABS.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: counts[tab.id],
  }));
  const current = RISK_TABS.find((tab) => tab.id === view.tab) ?? RISK_TABS[0];

  return (
    <>
      <PageHeader
        title="Risk & checks"
        sub="Storefront customers pay first, so fraud shows up as chargebacks. These checks stop most of it before a supplier is paid."
      />
      <div className="mb-4">
        <Tabs items={items} value={view.tab} onChange={view.setTab} label="Risk sections" />
      </div>
      <div role="tabpanel" aria-label={current.label}>
        {view.tab === 'queue' && <QueueTab grants={grants} />}
        {view.tab === 'checks' && <ChecksTab view={view} />}
        {view.tab === 'block' && <BlocklistTab view={view} grants={grants} />}
        {view.tab === 'rules' && <RulesTab grants={grants} />}
      </div>
      <OrderDrawerHost />
    </>
  );
}

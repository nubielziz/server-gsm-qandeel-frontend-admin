// CommissionsPage: "Commissions" (`/commissions`, the demo's `pageCommissions` in 46-p-commissions.js). A header with the ready sentence,
// the strip of key figures, and three tabs kept in the address (`?tab=`): Accruals (default), Agents and Plans. The page only
// composes; each tab owns its data, and the server computes and pays every figure.
import { Panel, SectionTabs, SkeletonTable, StatGrid, type TabItem } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { AccrualsTab } from '../components/AccrualsTab';
import { AgentsTab } from '../components/AgentsTab';
import { CommissionsHeader } from '../components/CommissionsHeader';
import { PlansTab } from '../components/PlansTab';
import { useAccrualCounts } from '../hooks/useAccrualCounts';
import { useCommissionGrants } from '../hooks/useCommissionGrants';
import { useCommissionTab } from '../hooks/useCommissionTab';
import { useStripCounts } from '../hooks/useStripCounts';
import { stripCells } from '../lib/figures';
import { COMMISSION_TABS, type CommissionsTab } from '../lib/tabs';

/** The page: header, strip, tabs and the tab the address names. */
export function CommissionsPage() {
  const grants = useCommissionGrants();
  const { tab, setTab } = useCommissionTab();
  const counts = useAccrualCounts(grants.ready);
  const strip = useStripCounts(counts.ready, grants.ready);

  const items: TabItem<CommissionsTab>[] = COMMISSION_TABS.map((spec) => ({
    value: spec.id,
    label: spec.label,
    // The demo shows the ready count on the Accruals tab only, and only when it is not zero.
    count: spec.id === 'accruals' && counts.ready ? counts.ready : undefined,
  }));

  return (
    <>
      <CommissionsHeader ready={counts.ready} />
      <StatGrid cells={stripCells(strip)} label="Commission figures" />
      <Panel flush>
        {!grants.ready ? (
          <SkeletonTable cols={5} rows={6} />
        ) : (
          <>
            <SectionTabs items={items} value={tab} onChange={setTab} label="Commission sections" />
            <div role="tabpanel" aria-label={COMMISSION_TABS.find((spec) => spec.id === tab)?.label}>
              {tab === 'accruals' && <AccrualsTab grants={grants} counts={counts} />}
              {tab === 'agents' && <AgentsTab grants={grants} />}
              {tab === 'plans' && <PlansTab grants={grants} />}
            </div>
          </>
        )}
      </Panel>
      <OrderDrawerHost />
    </>
  );
}

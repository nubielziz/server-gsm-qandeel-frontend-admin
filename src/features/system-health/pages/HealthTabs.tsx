// HealthTabs: the tab strip of the System health page (`?tab=`) and the open tab below it. A role sees only the tabs it may
// read; each tab loads as its own chunk (docs/system-health-design.md, "Tabs" and "Permission map").
import { Suspense } from 'react';
import { Panel, Tabs } from '@/components/ui';
import { CardSkeleton } from '../components/CardSkeleton';
import { PartBoundary } from '../header/PartBoundary';
import type { HealthGrants } from '../hooks';
import { HEALTH_TABS } from '../lib/healthTabs';
import { TAB_COMPONENTS } from './tabComponents';
import { useHealthTab } from './useHealthTab';

/** What shows while a tab's chunk loads. */
function TabLoading() {
  return (
    <div aria-busy="true">
      <Panel>
        <CardSkeleton lines={4} />
      </Panel>
    </div>
  );
}

export interface HealthTabsProps {
  grants: HealthGrants;
}

/**
 * The strip scrolls sideways inside itself on a phone (the kit's `Tabs`), so the page never does. The panel below carries the
 * open tab's name for assistive technology. A tab that throws shows a note in the panel; the strip and the status stay.
 */
export function HealthTabs({ grants }: HealthTabsProps) {
  const visible = HEALTH_TABS.filter((tab) => grants.can(tab.permissions));
  const [active, setActive] = useHealthTab(visible.map((tab) => tab.id));
  const current = visible.find((tab) => tab.id === active);
  if (active === undefined || current === undefined) return null;

  const Tab = TAB_COMPONENTS[active];
  return (
    <div>
      <Tabs
        items={visible.map((tab) => ({ value: tab.id, label: tab.label }))}
        value={active}
        onChange={setActive}
        label="System health sections"
      />
      <div role="tabpanel" aria-label={current.label} className="mt-4">
        <PartBoundary name={`The ${current.label} tab`} resetKey={active}>
          <Suspense fallback={<TabLoading />}>
            <Tab />
          </Suspense>
        </PartBoundary>
      </div>
    </div>
  );
}

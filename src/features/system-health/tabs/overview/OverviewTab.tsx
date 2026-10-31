// OverviewTab: the Overview tab of the System health page (route group `health`): the components with their check history,
// the response time of the picked one, the open alerts and incidents, and the build. It only composes the cards.
import { PartBoundary } from '../../header/PartBoundary';
import { useSystemHealth } from '../../hooks';
import { AlertsCard } from './AlertsCard';
import { BuildCard } from './BuildCard';
import { ComponentsCard } from './ComponentsCard';
import { ResponseTimeCard } from './ResponseTimeCard';
import { usePickedComponent } from './usePickedComponent';

/**
 * Desktop: the components across the top; the response time under it on the left, with the alerts and the build on the
 * right. Below `xl` everything stacks in that order. The picked component (`?component=`) is shared by the list, which
 * marks it, and the chart, which draws it. Each card sits in its own boundary, so a shape the console does not expect
 * costs one card, not the tab.
 */
export function OverviewTab() {
  const health = useSystemHealth();
  const picked = usePickedComponent(health.data?.components);
  // A new health answer gives a card that threw another try.
  const retry = health.dataUpdatedAt;
  return (
    <div className="space-y-4">
      <PartBoundary name="The components list" resetKey={retry}>
        <ComponentsCard picked={picked} />
      </PartBoundary>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <PartBoundary name="The response time chart" resetKey={retry}>
            <ResponseTimeCard picked={picked} />
          </PartBoundary>
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-5">
          <PartBoundary name="The open alerts" resetKey={retry}>
            <AlertsCard />
          </PartBoundary>
          <PartBoundary name="The build" resetKey={retry}>
            <BuildCard />
          </PartBoundary>
        </div>
      </div>
    </div>
  );
}

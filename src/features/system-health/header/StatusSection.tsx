// StatusSection: the verdict, the key figures and the hidden live region, each in its own boundary, so a part that cannot
// draw an answer shows a note in its own place and the others stay (docs/system-health-design.md, "States").
import { useSystemHealth } from '../hooks';
import { KpiRow } from './KpiRow';
import { PartBoundary } from './PartBoundary';
import { StatusAnnouncer } from './StatusAnnouncer';
import { VerdictPanel } from './VerdictPanel';

/** Shown only to a staff member with `system:read`. A boundary tries its part again with the next health answer. */
export function StatusSection() {
  const { dataUpdatedAt } = useSystemHealth();
  return (
    <>
      <PartBoundary name="The status announcements" resetKey={dataUpdatedAt} fallback={null}>
        <StatusAnnouncer />
      </PartBoundary>
      <PartBoundary name="The verdict" resetKey={dataUpdatedAt}>
        <VerdictPanel />
      </PartBoundary>
      <PartBoundary name="The key figures" resetKey={dataUpdatedAt}>
        <KpiRow />
      </PartBoundary>
    </>
  );
}

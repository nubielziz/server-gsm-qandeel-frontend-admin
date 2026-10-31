// StatusAnnouncer: a visually hidden `aria-live="polite"` region that says when the verdict or a KPI state changes, so a
// screen-reader user hears "Orders past SLA is now Critical." without watching the page (docs/system-health-design.md, "States").
import { useSystemHealth } from '../hooks';
import { announcementItems, useAnnouncement } from './announce';
import { useKpis } from './useKpis';

/** It shares the reads of the verdict and the KPI row, so it adds no request. */
export function StatusAnnouncer() {
  const health = useSystemHealth();
  const tiles = useKpis();
  const message = useAnnouncement(announcementItems(health, tiles));
  return (
    <div role="status" aria-live="polite" aria-atomic="true" aria-label="Status changes" className="sr-only">
      {message}
    </div>
  );
}

// MonitoringNote: a quiet note above the alerts when the monitoring system is down, so a list is never read as complete
// (docs/system-health-design.md: no data is never green). An empty list says the same in its empty state instead.
import { Icon } from '@/components/ui';

/** Drawn when monitoring is down (`useMonitoringBlind`) and the list has rows: the rules may not be checked. */
export function MonitoringNote() {
  return (
    <p role="note" className="flex gap-2 border-b border-line bg-sunken px-3.5 py-2.5 text-sm text-ink2">
      <Icon name="info" className="ic-sm mt-0.5 flex-none text-ink3" />
      <span>
        Monitoring is unavailable, so alert rules may not be checked right now. This list can be out of date.
      </span>
    </p>
  );
}

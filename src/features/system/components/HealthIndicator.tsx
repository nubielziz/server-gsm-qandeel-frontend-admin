// HealthIndicator: API status at the sidebar foot (dot + words + time of the last check), polled from `GET /health`.
// Replaces the "synthetic data" note of the demo's sidebar (renderNav in 90-app.js).
import { StatusDot } from '@/components/ui';
import { fmtTime } from '@/lib/format';
import { useHealth } from '../hooks/useHealth';
import { describeHealth } from './healthStatus';

/** "API healthy", "API degraded" or "API unreachable". The dot repeats the state; the words carry it. */
export function HealthIndicator() {
  const health = useHealth();
  const view = describeHealth({ data: health.data, isError: health.isError });
  // The latest answer counts, whether it was an answer or a failure.
  const checkedAt = Math.max(health.dataUpdatedAt, health.errorUpdatedAt);

  return (
    <div className="flex items-start gap-1.5 text-xs">
      <StatusDot tone={view.tone} className="mt-1" />
      <div className="min-w-0 leading-tight">
        <p className="font-medium text-ink2">{view.label}</p>
        {view.detail && <p className="mt-0.5 text-ink3">{view.detail}</p>}
        {checkedAt > 0 && <p className="mt-0.5 text-ink3">Checked {fmtTime(checkedAt)}</p>}
      </div>
    </div>
  );
}

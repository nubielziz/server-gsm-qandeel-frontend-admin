// KpiRow: the six key figures under the verdict, in one panel: uptime, API p95, 5xx rate, oldest queued job, orders past
// SLA and open alerts. Always "now" and the last 24 hours, whatever range the page is set to (docs/system-health-design.md).
import { useNow } from '@/lib/format';
import { KpiCell } from './KpiCell';
import { useKpis } from './useKpis';

/**
 * Two columns below `md`, three at `md`, six from `xl`. The hairlines between tiles are the 1px gaps of a grid on the line
 * colour, so they stay right at every column count (six divides evenly by two, three and six).
 */
export function KpiRow() {
  const tiles = useKpis();
  const now = useNow(5000);
  return (
    <section aria-label="Key figures" className="panel mb-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <KpiCell key={tile.id} model={tile} now={now} />
        ))}
      </div>
    </section>
  );
}

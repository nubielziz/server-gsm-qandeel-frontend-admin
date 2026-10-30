// SupplierCharts: the two line charts of the last 24 hours (success rate against the 90% target, and median latency) and the
// "View chart data as a table" fallback. Ports the `charts` block of supDetail and the `sup-ok` and `sup-ms` charts of
// 44-p-suppliers.js. Drawn only when the supplier detail has an hourly history; without one the block is left out.
import { LineChart } from '@/components/charts';
import { fmtDate, pct } from '@/lib/format';
import { chartPoints, latencyLabel, msText, percentLabel, SUCCESS_TARGET } from '../lib/metrics';
import type { HourlyPoint } from '../types';

export interface SupplierChartsProps {
  name: string;
  history: readonly HourlyPoint[];
}

/** The two charts and the table fallback; draws nothing when the detail has no hourly history. */
export function SupplierCharts({ name, history }: SupplierChartsProps) {
  if (history.length === 0) return null;
  const last = history[history.length - 1];
  return (
    <>
      <div className="grid gap-0 border-b border-line md:grid-cols-2 md:divide-x md:divide-line rtl:md:divide-x-reverse">
        <div className="p-3.5">
          <h3 className="mb-2 text-sm font-medium">Success rate, last 24 hours</h3>
          <LineChart
            points={chartPoints(history, (point) => point.successRate)}
            height={150}
            yMax={100}
            yMin={0}
            ticks={4}
            formatValue={percentLabel}
            reference={{ value: SUCCESS_TARGET, label: `${SUCCESS_TARGET}% target` }}
            label={`Line chart: hourly success rate for ${name} over the last 24 hours, against a ${SUCCESS_TARGET}% target. Latest ${pct(last.successRate, 1)}`}
          />
        </div>
        <div className="border-t border-line p-3.5 md:border-t-0">
          <h3 className="mb-2 text-sm font-medium">
            Median latency, last 24 hours <span className="text-xs font-normal text-ink3">(ms)</span>
          </h3>
          <LineChart
            points={chartPoints(history, (point) => point.medianMs)}
            height={150}
            ticks={3}
            formatValue={latencyLabel}
            unit=" ms"
            label={`Line chart: hourly median latency for ${name}. Latest ${msText(last.medianMs)}`}
          />
        </div>
      </div>
      <details className="border-b border-line px-3.5 py-2 text-sm">
        <summary className="cursor-pointer select-none text-ink2 hover:text-ink">
          View chart data as a table
        </summary>
        <div className="tbl-wrap mt-2 max-h-56 overflow-auto">
          <table className="tbl" aria-label={`Hourly success and latency for ${name}`}>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col" className="num">
                  Success
                </th>
                <th scope="col" className="num">
                  Median latency
                </th>
              </tr>
            </thead>
            <tbody>
              {history
                .slice()
                .reverse()
                .map((point) => (
                  <tr key={point.at}>
                    <td className="mono">{fmtDate(point.at)}</td>
                    <td className="num">{pct(point.successRate, 1)}</td>
                    <td className="num">{msText(point.medianMs)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

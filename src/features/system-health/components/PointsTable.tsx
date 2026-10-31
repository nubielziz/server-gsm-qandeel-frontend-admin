// PointsTable: the numbers behind a chart as a table, the accessible fallback of ChartCard's "Table view".
import type { MeasureUnit, SeriesPoint } from '../types';
import { chartDetail, formatValue } from '../lib';

export interface PointsTableProps {
  points: readonly SeriesPoint[];
  unit: MeasureUnit;
  /** Screen-reader caption: the chart's name. */
  caption: string;
  /** Header of the value column ("p95 latency"). */
  valueLabel: string;
}

/** Newest first, like the kit's SeriesTable. A gap prints "No data", never 0. */
export function PointsTable({ points, unit, caption, valueLabel }: PointsTableProps) {
  return (
    <div className="tbl-wrap max-h-[264px]">
      <table className="tbl">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col" className="num">
              {valueLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {points
            .slice()
            .reverse()
            .map((point) => (
              <tr key={point.at}>
                <td>{chartDetail(point.at)}</td>
                <td className={point.value === null ? 'num text-ink3' : 'num'}>
                  {formatValue(point.value, unit)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// SeriesTable: the chart's numbers as a table, the accessible fallback. Ports seriesTable(rows) of 30-charts.js.
import { SERIES, type SeriesDef, type StackedRow } from './chartSeries';
import { formatNumber, sum } from './scale';

export interface SeriesTableProps {
  rows: readonly StackedRow[];
  series?: readonly SeriesDef[];
  /** Screen-reader caption. */
  caption?: string;
  /** Name of the first column. */
  periodLabel?: string;
}

/** Newest period first, with a total column that counts every series (also the ones hidden in the chart). */
export function SeriesTable({
  rows,
  series = SERIES,
  caption = 'Orders by type',
  periodLabel = 'Period',
}: SeriesTableProps) {
  return (
    <div className="tbl-wrap max-h-[264px]">
      <table className="tbl">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{periodLabel}</th>
            {series.map((s) => (
              <th key={s.key} className="num" scope="col">
                {s.label}
              </th>
            ))}
            <th className="num" scope="col">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows
            .slice()
            .reverse()
            .map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {series.map((s) => (
                  <td key={s.key} className="num">
                    {formatNumber(row.values[s.key] ?? 0)}
                  </td>
                ))}
                <td className="num font-medium">
                  {formatNumber(sum(series, (s) => row.values[s.key] ?? 0))}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// VatReport: VAT due by country and month for a period (this or last month or quarter). New (MISMATCHES M124). The server works it
// out from ledger entries, not invoices, and sends the totals; this shows them. Needs `reports:finance`.
import { EmptyState, QueryState, SegmentedControl, SkeletonTable } from '@/components/ui';
import { money, num, pct } from '@/lib/format';
import { useVatReport } from '../hooks/useReports';
import { countryName, dayLabel, monthLabel, VAT_PERIODS } from '../lib/reports';
import type { ReportChoices } from '../lib/reportView';
import { ReportStats } from './ReportStats';

export interface VatReportProps {
  choices: ReportChoices;
  onChange: (patch: Partial<ReportChoices>) => void;
}

export function VatReport({ choices, onChange }: VatReportProps) {
  const report = useVatReport(choices.period);
  const data = report.data;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <SegmentedControl
          label="VAT period"
          items={VAT_PERIODS}
          value={choices.period}
          onChange={(period) => onChange({ period })}
        />
        {data && (
          <span className="text-xs text-ink3">
            {dayLabel(data.from)} to {dayLabel(data.to)}, worked out from ledger entries
          </span>
        )}
      </div>
      <div className="border-t border-line">
        <QueryState
          isLoading={report.isLoading}
          isError={report.isError}
          error={report.error}
          onRetry={() => void report.refetch()}
          errorTitle="Could not load the VAT report"
          skeleton={<SkeletonTable cols={5} rows={6} />}
          isEmpty={!data || data.rows.length === 0}
          empty={
            <EmptyState icon="percent" title="No VAT due in this period">
              VAT is posted when a storefront order is delivered.
            </EmptyState>
          }
        >
          {data && (
            <>
              <ReportStats
                label="VAT totals"
                stats={[
                  { label: 'VAT due', value: money(data.totals.vat) },
                  { label: 'Sales before VAT', value: money(data.totals.taxable) },
                  { label: 'Orders', value: num(data.totals.orders) },
                ]}
              />
              <div className="tbl-wrap max-h-[420px]">
                <table className="tbl" aria-label="VAT by country">
                  <thead>
                    <tr>
                      <th scope="col">Country</th>
                      <th scope="col">Month</th>
                      <th scope="col" className="num">
                        Rate
                      </th>
                      <th scope="col" className="num">
                        Orders
                      </th>
                      <th scope="col" className="num">
                        Sales before VAT
                      </th>
                      <th scope="col" className="num">
                        VAT due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={`${row.country}-${row.period}`}>
                        <td className="font-medium">
                          {countryName(row.country)}
                          <span className="mono ms-2 text-2xs text-ink3">{row.country}</span>
                        </td>
                        <td className="text-ink2">{monthLabel(row.period)}</td>
                        <td className="num">{pct(row.rate)}</td>
                        <td className="num">{num(row.orders)}</td>
                        <td className="num">{money(row.taxable)}</td>
                        <td className="num">{money(row.vat)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium">
                      <td colSpan={3}>Total</td>
                      <td className="num">{num(data.totals.orders)}</td>
                      <td className="num">{money(data.totals.taxable)}</td>
                      <td className="num">{money(data.totals.vat)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </QueryState>
      </div>
    </>
  );
}

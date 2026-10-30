// WalletExposureReport: what the merchants' wallets hold, what is reserved for open orders and the overdraft allowed and used,
// with the largest wallets first. New (MISMATCHES M124). The server adds the wallets up; each merchant links to its page.
import { Link } from 'react-router';
import { EmptyState, QueryState, SkeletonTable } from '@/components/ui';
import { money, money0, num, toAmount } from '@/lib/format';
import { useWalletExposure } from '../hooks/useReports';
import { ReportStats } from './ReportStats';

export function WalletExposureReport() {
  const report = useWalletExposure();
  const data = report.data;
  return (
    <div className="border-t border-line">
      <QueryState
        isLoading={report.isLoading}
        isError={report.isError}
        error={report.error}
        onRetry={() => void report.refetch()}
        errorTitle="Could not load the wallet exposure"
        skeleton={<SkeletonTable cols={5} rows={8} />}
        isEmpty={!data || data.rows.length === 0}
        empty={
          <EmptyState icon="wallet" title="No merchant wallets yet">
            Wallets appear here once a merchant tops up.
          </EmptyState>
        }
      >
        {data && (
          <>
            <ReportStats
              label="Wallet totals"
              stats={[
                {
                  label: 'Wallet balances',
                  value: money0(data.totals.balance),
                  sub: `${num(data.totals.clients)} merchants`,
                },
                { label: 'Held in open orders', value: money0(data.totals.reserved) },
                { label: 'Overdraft allowed', value: money0(data.totals.overdraftLimit) },
                {
                  label: 'Overdraft in use',
                  value: money0(data.totals.overdraftUsed),
                  sub: `${num(data.totals.inOverdraft)} ${data.totals.inOverdraft === 1 ? 'merchant' : 'merchants'} overdrawn`,
                  className: toAmount(data.totals.overdraftUsed) > 0 ? 'text-warn-fg' : undefined,
                },
              ]}
            />
            <div className="tbl-wrap max-h-[420px]">
              <table className="tbl" aria-label="Wallets by merchant">
                <thead>
                  <tr>
                    <th scope="col">Merchant</th>
                    <th scope="col" className="num">
                      Balance
                    </th>
                    <th scope="col" className="num">
                      Reserved
                    </th>
                    <th scope="col" className="num">
                      Overdraft allowed
                    </th>
                    <th scope="col" className="num">
                      Overdraft used
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.clientId}>
                      <td className="font-medium">
                        <Link className="link" to={`/merchants/${row.clientId}`}>
                          {row.name}
                        </Link>
                      </td>
                      <td className={toAmount(row.balance) < 0 ? 'num text-crit-fg' : 'num'}>
                        {money(row.balance)}
                      </td>
                      <td className="num">{money(row.reserved)}</td>
                      <td className="num">{money(row.overdraftLimit)}</td>
                      <td className={toAmount(row.overdraftUsed) > 0 ? 'num text-warn-fg' : 'num'}>
                        {money(row.overdraftUsed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}

// TopMerchantsPanel: "Top merchants", the best-spending merchants of the period with their wallet balance. It asks for its
// own data (`GET /admin/reports/top-clients`), so the page shows it only to staff with `reports:read`. Ports topMerchantsPanel()
// of 40-p-dashboard.js.
import { EmptyState, ErrorState, errorText, Panel, SkeletonTable } from '@/components/ui';
import { money0, num, toAmount } from '@/lib/format';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { useTopClients } from '../hooks/useTopClients';
import { merchantTarget } from '../lib/links';
import { periodWords } from '../lib/labels';
import type { DashboardDays } from '../types';
import { LinkedRow } from './LinkedRow';
import { NameLink } from './NameLink';

/** The best-spending merchants. It loads its own report, so only render it for staff with `reports:read`. */
export function TopMerchantsPanel({ days }: { days: DashboardDays }) {
  const query = useTopClients(days);
  const canOpen = useCanOpenPage('merchants') === true;
  const clients = query.data;
  // The previous list stays on screen while another period loads; the page dims the whole board once.
  return (
    <Panel title="Top merchants" sub={`By spend, last ${periodWords(days)}`} flush>
      {query.isError ? (
        <ErrorState
          title="Could not load the top merchants"
          detail={errorText(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : !clients ? (
        <SkeletonTable cols={4} rows={4} />
      ) : clients.length === 0 ? (
        <EmptyState icon="users" title="No merchant activity yet">
          Your highest-spending merchants appear here.
        </EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <caption className="sr-only">Top merchants by spend</caption>
            <thead>
              <tr>
                <th scope="col">Merchant</th>
                <th scope="col" className="num">
                  Orders
                </th>
                <th scope="col" className="num">
                  Spend
                </th>
                <th scope="col" className="num hidden sm:table-cell">
                  Wallet
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const to = canOpen ? merchantTarget(client.id).to : undefined;
                return (
                  <LinkedRow key={client.id} to={to}>
                    <td>
                      <NameLink to={to}>{client.name}</NameLink>{' '}
                      <span className="mono text-ink3">{client.country}</span>
                    </td>
                    <td className="num">{num(client.orders)}</td>
                    <td className="num">{money0(client.spend)}</td>
                    {/* A negative wallet is the one thing worth colour here; the sign is display maths only. */}
                    <td
                      className={
                        toAmount(client.walletBalance) < 0
                          ? 'num hidden text-crit-fg sm:table-cell'
                          : 'num hidden sm:table-cell'
                      }
                    >
                      {money0(client.walletBalance)}
                    </td>
                  </LinkedRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

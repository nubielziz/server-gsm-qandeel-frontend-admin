// TopAccountsPanel: "Top accounts", the accounts that bought most over the period through the door of the channel shown, with their rank
// and their live wallet. Merchants and storefront buyers (guests too) are one ranking, because both are accounts. It asks for its own
// data (`GET /admin/reports/top-clients`), so the page shows it only to staff with `reports:read`. Ports topMerchantsPanel() and
// topCustomersPanel() of 40-p-dashboard.js, which this one panel replaces.
import { EmptyState, ErrorState, errorText, Panel, SkeletonTable } from '@/components/ui';
import { accountLabel, money0, num, toAmount } from '@/lib/format';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { useTopClients } from '../hooks/useTopClients';
import { periodWords, SCOPE_LABEL } from '../lib/labels';
import { accountTarget } from '../lib/links';
import type { DashboardDays, DashboardScope } from '../types';
import { LinkedRow } from './LinkedRow';
import { NameLink } from './NameLink';

export interface TopAccountsPanelProps {
  days: DashboardDays;
  /** The channel shown: the list covers the orders that came through that door (all, the merchant portal and API, or the storefront). */
  scope: DashboardScope;
}

/** The best-spending accounts. It loads its own report, so only render it for staff with `reports:read`. */
export function TopAccountsPanel({ days, scope }: TopAccountsPanelProps) {
  const query = useTopClients(days, scope);
  const canOpen = useCanOpenPage('accounts') === true;
  const accounts = query.data;
  const where = scope === 'all' ? '' : `${SCOPE_LABEL[scope]}, `;
  // The previous list stays on screen while another period or channel loads; the page dims the whole board once.
  return (
    <Panel title="Top accounts" sub={`By spend, ${where}last ${periodWords(days)}`} flush>
      {query.isError ? (
        <ErrorState
          title="Could not load the top accounts"
          detail={errorText(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : !accounts ? (
        <SkeletonTable cols={4} rows={4} />
      ) : accounts.length === 0 ? (
        <EmptyState icon="users" title="No account activity yet">
          Your highest-spending accounts appear here.
        </EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <caption className="sr-only">Top accounts by spend</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col" className="hidden sm:table-cell">
                  Rank
                </th>
                <th scope="col" className="num">
                  Orders
                </th>
                <th scope="col" className="num">
                  Spend
                </th>
                <th scope="col" className="num hidden sm:table-cell">
                  Profit
                </th>
                <th scope="col" className="num hidden sm:table-cell">
                  Wallet
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const to = canOpen ? accountTarget(account.id).to : undefined;
                return (
                  <LinkedRow key={account.id} to={to}>
                    <td>
                      <NameLink to={to}>{accountLabel(account)}</NameLink>{' '}
                      <span className="mono text-2xs text-ink3">{account.country}</span>
                      {!account.hasAccount && <span className="ml-1 text-2xs text-ink3">Guest</span>}
                    </td>
                    <td className="hidden sm:table-cell">{account.rank.name}</td>
                    <td className="num">{num(account.orders)}</td>
                    <td className="num">{money0(account.spend)}</td>
                    <td className="num hidden sm:table-cell">{money0(account.profit)}</td>
                    {/* A guest has no wallet. A negative wallet is the one thing worth colour here; the sign is display maths only. */}
                    <td
                      className={
                        account.hasAccount && toAmount(account.walletBalance) < 0
                          ? 'num hidden text-crit-fg sm:table-cell'
                          : 'num hidden sm:table-cell'
                      }
                    >
                      {account.hasAccount ? money0(account.walletBalance) : '–'}
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

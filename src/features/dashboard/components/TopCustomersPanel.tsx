// TopCustomersPanel: "Top customers", the storefront's best five by spend over the period. The list comes with the dashboard
// payload. Ports topCustomersPanel() of 40-p-dashboard.js.
import { EmptyState, Panel, SkeletonTable } from '@/components/ui';
import { money0, num } from '@/lib/format';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { customerTarget } from '../lib/links';
import { periodWords } from '../lib/labels';
import type { DashboardDays, TopCustomer } from '../types';
import { LinkedRow } from './LinkedRow';
import { NameLink } from './NameLink';

export interface TopCustomersPanelProps {
  /** `undefined` while the dashboard loads; `null` when the server sent none (the panel then stays out). */
  customers: TopCustomer[] | null | undefined;
  days: DashboardDays;
}

/** The storefront's best customers, from the dashboard payload; nothing when the server sent none. */
export function TopCustomersPanel({ customers, days }: TopCustomersPanelProps) {
  const canOpen = useCanOpenPage('customers') === true;
  if (customers === null) return null;
  return (
    <Panel title="Top customers" sub={`Storefront, by spend, last ${periodWords(days)}`} flush>
      {!customers ? (
        <SkeletonTable cols={3} rows={4} />
      ) : customers.length === 0 ? (
        <EmptyState icon="user" title="No customer orders yet">
          Your best storefront customers appear here.
        </EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <caption className="sr-only">Top customers by spend</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col" className="num">
                  Orders
                </th>
                <th scope="col" className="num">
                  Spend
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const to = canOpen ? customerTarget(customer.id).to : undefined;
                return (
                  <LinkedRow key={customer.id} to={to}>
                    <td>
                      <NameLink to={to}>{customer.name}</NameLink>{' '}
                      <span className="mono text-2xs text-ink3">{customer.country}</span>
                    </td>
                    <td className="num">{num(customer.orders)}</td>
                    <td className="num">{money0(customer.spend)}</td>
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

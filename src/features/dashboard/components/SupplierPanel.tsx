// SupplierPanel: "Supplier health", one row per supplier with its status, last-hour success, p50 time and prepaid balance.
// Ports supplierPanel() of 40-p-dashboard.js. A row opens that supplier on the Suppliers page.
import { ButtonLink, EmptyState, Icon, Panel, SkeletonTable } from '@/components/ui';
import { dur, money0, pct } from '@/lib/format';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { SUPPLIERS_PAGE, supplierTarget } from '../lib/links';
import type { SupplierHealth } from '../types';
import { LinkedRow } from './LinkedRow';
import { NameLink } from './NameLink';
import { SupplierStatus } from './SupplierStatus';

export interface SupplierPanelProps {
  /** `undefined` while the dashboard loads. */
  suppliers: SupplierHealth[] | undefined;
}

/** The supplier table; each name links to that supplier when the staff member may open Suppliers. */
export function SupplierPanel({ suppliers }: SupplierPanelProps) {
  const canOpen = useCanOpenPage('suppliers') === true;
  if (!suppliers) {
    return (
      <Panel title="Supplier health" sub="Last hour" flush>
        <SkeletonTable cols={4} rows={4} />
      </Panel>
    );
  }
  return (
    <Panel title="Supplier health" sub="Last hour" flush>
      {suppliers.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <caption className="sr-only">Supplier health</caption>
            <thead>
              <tr>
                <th scope="col">Supplier</th>
                <th scope="col">Status</th>
                <th scope="col" className="num hidden sm:table-cell">
                  1h success
                </th>
                <th scope="col" className="num hidden md:table-cell">
                  p50
                </th>
                <th scope="col" className="num">
                  Prepaid
                </th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => {
                const to = canOpen ? supplierTarget(supplier.id).to : undefined;
                return (
                  <LinkedRow key={supplier.id} to={to}>
                    <td>
                      <NameLink to={to}>{supplier.name}</NameLink>
                    </td>
                    <td>
                      <SupplierStatus supplier={supplier} />
                    </td>
                    <td className="num hidden sm:table-cell">
                      {supplier.successRate1h === null ? '–' : pct(supplier.successRate1h, 0)}
                    </td>
                    <td className="num hidden md:table-cell">
                      {supplier.p50Ms === null ? '–' : dur(supplier.p50Ms)}
                    </td>
                    <td className={supplier.lowBalance ? 'num font-medium text-warn-fg' : 'num'}>
                      {supplier.lowBalance && <Icon name="alert" className="ic-xs mr-1 inline" />}
                      {money0(supplier.balance)}
                    </td>
                  </LinkedRow>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="server"
          title="No suppliers connected"
          cta={
            canOpen ? (
              <ButtonLink to={SUPPLIERS_PAGE.to}>
                <Icon name="plus" className="ic-sm" />
                Add supplier
              </ButtonLink>
            ) : undefined
          }
        >
          Add a supplier API to route orders. Dhru Fusion 6.1 and REST suppliers are supported.
        </EmptyState>
      )}
    </Panel>
  );
}

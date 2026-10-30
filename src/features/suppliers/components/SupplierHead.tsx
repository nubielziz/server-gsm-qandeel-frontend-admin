// SupplierHead: the detail's header: the supplier's name, state, API type and host, and its actions: Test connection, Sync now
// and the "⋯" menu. Ports the `head` of supDetail in 44-p-suppliers.js. Record top-up is gone: the map has no route for it and
// the balance comes from the supplier, so Sync now is the main action (MISMATCHES, MISMATCHES M61).
import { Button, Icon } from '@/components/ui';
import type { SupplierGrants } from '../hooks/useSupplierGrants';
import { driverLabel, hostOf } from '../lib/connection';
import type { Supplier, SupplierLink } from '../types';
import { SupplierMenu } from './SupplierMenu';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import type { SupplierDialogState } from './supplierDialogState';

export interface SupplierHeadProps {
  supplier: Supplier;
  grants: SupplierGrants;
  links: readonly SupplierLink[] | undefined;
  /** A banner with its own main button is showing, so Sync now is not the page's primary action. */
  bannerPrimary: boolean;
  testing: boolean;
  syncing: boolean;
  onTest: () => void;
  onSync: () => void;
  onEnable: (supplier: Supplier) => void;
  onDialog: (dialog: SupplierDialogState) => void;
}

/** Name, state and the header buttons. Test and Sync show a spinner while they run; the buttons need `suppliers:update`. */
export function SupplierHead({
  supplier,
  grants,
  links,
  bannerPrimary,
  testing,
  syncing,
  onTest,
  onSync,
  onEnable,
  onDialog,
}: SupplierHeadProps) {
  const lock = grants.needs('suppliers:update');
  return (
    <div className="panel-h !min-h-[56px] flex-wrap gap-y-2">
      <div className="min-w-[13rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{supplier.name}</h2>
          <SupplierStatusBadge supplier={supplier} />
        </div>
        <p className="mono mt-0.5 text-ink3">
          {driverLabel(supplier.driver)} · {hostOf(supplier.baseUrl)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={lock.disabled} title={lock.title} loading={testing} onClick={onTest}>
          <Icon name="bolt" className="ic-sm" />
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
        <Button
          variant={bannerPrimary ? 'default' : 'primary'}
          disabled={lock.disabled}
          title={lock.title}
          loading={syncing}
          onClick={onSync}
        >
          <Icon name="refresh" className="ic-sm" />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
        <SupplierMenu
          supplier={supplier}
          grants={grants}
          links={links}
          onDialog={onDialog}
          onEnable={onEnable}
        />
      </div>
    </div>
  );
}

// SuppliersPage: the Suppliers page (`/suppliers`, the demo's `pageSuppliers` in 44-p-suppliers.js): a header with the health
// counts, the supplier list on the left and the selected supplier's detail on the right. The selection lives in the address
// (`?supplier=<id>`), the first supplier is selected by default. The page only composes; the server owns every number.
import { useState } from 'react';
import { Button, EmptyState, ErrorState, Icon, Panel, SkeletonTable } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { SupplierDetailPanel } from '../components/SupplierDetailPanel';
import { SupplierDialogs } from '../components/SupplierDialogs';
import { SupplierList } from '../components/SupplierList';
import { SuppliersHeader } from '../components/SuppliersHeader';
import type { SupplierDialogState } from '../components/supplierDialogState';
import { useSupplierGrants } from '../hooks/useSupplierGrants';
import { useSupplierSelection } from '../hooks/useSupplierSelection';
import { useSuppliers } from '../hooks/useSuppliers';

/** Below this width the list sits above the detail, so choosing a supplier scrolls to it (the demo's `innerWidth < 1024`). */
const STACKED_BELOW_PX = 1024;

/** The route component: loads the list, keeps the selection in the address and composes the panels and dialogs. */
export function SuppliersPage() {
  const grants = useSupplierGrants();
  const list = useSuppliers({ enabled: grants.ready });
  const { selected, select } = useSupplierSelection(list.suppliers);
  const [dialog, setDialog] = useState<SupplierDialogState | null>(null);
  const connect = () => setDialog({ kind: 'connect' });
  const empty = list.query.isSuccess && list.suppliers.length === 0;
  const lock = grants.needs('suppliers:create');

  function choose(id: number) {
    select(id);
    if (window.innerWidth < STACKED_BELOW_PX)
      document.getElementById('sup-detail')?.scrollIntoView?.({ block: 'start' });
  }

  let body;
  if (list.query.isLoading || !grants.ready) {
    body = (
      <Panel flush>
        <SkeletonTable cols={4} rows={6} />
      </Panel>
    );
  } else if (list.query.isError) {
    body = (
      <Panel flush>
        <ErrorState
          title="Could not load the suppliers"
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
        />
      </Panel>
    );
  } else if (empty) {
    body = (
      <Panel flush>
        <EmptyState
          icon="server"
          title="No suppliers connected"
          cta={
            <Button disabled={lock.disabled} title={lock.title} variant="primary" onClick={connect}>
              <Icon name="plus" className="ic-sm" />
              Connect supplier
            </Button>
          }
        >
          Connect a supplier API (Dhru Fusion 6.1 or REST) to import its services and start dispatching
          orders.
        </EmptyState>
      </Panel>
    );
  } else {
    body = (
      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SupplierList suppliers={list.suppliers} selectedId={selected?.id} onSelect={choose} />
        {selected && (
          <SupplierDetailPanel key={selected.id} row={selected} grants={grants} onDialog={setDialog} />
        )}
      </div>
    );
  }

  return (
    <>
      <SuppliersHeader
        suppliers={list.query.isSuccess ? list.suppliers : undefined}
        grants={grants}
        hideConnect={empty}
        onConnect={connect}
      />
      {body}
      <OrderDrawerHost />
      <SupplierDialogs
        dialog={dialog}
        onChange={setDialog}
        onSelect={select}
        canTest={grants.can('suppliers:update')}
      />
    </>
  );
}

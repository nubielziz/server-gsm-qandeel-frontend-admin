// ApiLogPanel: the "API log" section at the bottom of the detail: the newest calls to the supplier, refreshed every 10 seconds
// while the page is visible, with a Pause toggle. Ports the live log of 44-p-suppliers.js (`logTable`, `sup-pause` and the
// interval that added fake calls): the rows are real here and the page asks the API again (MISMATCHES M63).
import { useState } from 'react';
import { Button, ErrorState, Icon, SkeletonTable } from '@/components/ui';
import { useSupplierLogs } from '../hooks/useSupplierLogs';
import type { Supplier } from '../types';
import { ApiLogDrawer } from './ApiLogDrawer';
import { ApiLogTable } from './ApiLogTable';

export interface ApiLogPanelProps {
  supplier: Pick<Supplier, 'id' | 'name'>;
  /** Opens an order's drawer; undefined when the staff member cannot read orders. */
  onOpenOrder?: (orderId: number) => void;
}

/** The log section: the header with the Pause toggle, the table and the call drawer. Pausing stops the 10-second refresh. */
export function ApiLogPanel({ supplier, onOpenOrder }: ApiLogPanelProps) {
  const [paused, setPaused] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const { logs, query } = useSupplierLogs(supplier.id, paused);

  let body;
  if (query.isLoading) body = <SkeletonTable cols={5} rows={5} />;
  else if (query.isError) {
    body = (
      <ErrorState
        title="Could not load the API log"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  } else body = <ApiLogTable logs={logs} onOpen={setOpenId} onOpenOrder={onOpenOrder} />;

  return (
    <div className="border-t border-line">
      <div className="panel-h">
        <div className="min-w-0 flex-1">
          <h3 className="panel-t">API log</h3>
          <p className="panel-s">
            {paused
              ? 'Paused. New calls are not shown.'
              : 'Live. The newest calls appear here every 10 seconds.'}
          </p>
        </div>
        <Button size="sm" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          <Icon name={paused ? 'play' : 'clock'} className="ic-sm" />
          {paused ? 'Resume live updates' : 'Pause live updates'}
        </Button>
      </div>
      <div className="tbl-wrap max-h-[360px] overflow-auto">{body}</div>
      <ApiLogDrawer
        id={openId}
        onClose={() => setOpenId(null)}
        // The call's drawer closes first, so the order's drawer does not open on top of it.
        onOpenOrder={
          onOpenOrder &&
          ((orderId) => {
            setOpenId(null);
            onOpenOrder(orderId);
          })
        }
      />
    </div>
  );
}

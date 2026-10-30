// RerouteDialog: "Reroute open orders…": lists a supplier's open orders, takes one target supplier (enabled, not down) and moves each order with
// `change-supplier` and `dispatch`, one at a time, with progress and a summary of the refused ones. Ports `sup-reroute` of 44-p-suppliers.js,
// which moved every order to its own fallback in one go; the API has no bulk route (MISMATCHES M62).
import { useState, type FormEvent } from 'react';
import {
  Button,
  EmptyState,
  errorText,
  Icon,
  Modal,
  QueryState,
  SelectField,
  SkeletonTable,
} from '@/components/ui';
import { orderLabel } from '@/features/orders';
import { useReroute } from '../hooks/useReroute';
import { REROUTE_LIMIT, useSupplierOrders } from '../hooks/useSupplierOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { ordersText } from '../lib/reroute';
import { canTakeOrders } from '../lib/state';
import type { Supplier } from '../types';
import { RerouteOrderList } from './RerouteOrderList';
import { RerouteResult } from './RerouteResult';

export interface RerouteDialogProps {
  supplier: Supplier;
  onClose: () => void;
}

/** Pick a target, start the run, read the summary. The dialog cannot be dismissed while the run is going. */
export function RerouteDialog({ supplier, onClose }: RerouteDialogProps) {
  const { suppliers } = useSuppliers();
  const orders = useSupplierOrders(supplier.id, true);
  const reroute = useReroute(supplier);
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const targets = suppliers.filter((candidate) => candidate.id !== supplier.id && canTakeOrders(candidate));
  const target = targets.find((candidate) => String(candidate.id) === targetId);
  const rows = orders.data?.data ?? [];
  const total = orders.data?.total ?? rows.length;
  const finished = reroute.data;
  const running = reroute.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running || finished) return;
    if (!target) {
      setError('Choose the supplier to move the orders to.');
      return;
    }
    setError(null);
    try {
      await reroute.mutateAsync({ ids: rows.map((order) => order.id), target });
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  const progress = reroute.progress;
  return (
    <Modal
      open
      size="lg"
      title={`Reroute open orders from ${supplier.name}`}
      sub={
        finished
          ? 'Done.'
          : 'Each order is re-sent to the supplier you choose and its status becomes Processing. The new supplier’s cost applies to your margin.'
      }
      onClose={onClose}
      dismissible={!running}
      error={error}
      onSubmit={(event) => void submit(event)}
      footer={
        finished ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button disabled={running} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={running}
              disabled={rows.length === 0 || targets.length === 0}
            >
              {running && progress
                ? `Rerouting ${progress.done} of ${progress.total}…`
                : `Reroute ${ordersText(rows.length)}`}
            </Button>
          </>
        )
      }
    >
      {finished ? (
        <RerouteResult
          outcome={finished}
          total={rows.length}
          targetName={target?.name ?? 'the new supplier'}
          labelOf={(id) => {
            const order = rows.find((candidate) => candidate.id === id);
            return order ? orderLabel(order) : `#${id}`;
          }}
        />
      ) : (
        <QueryState
          isLoading={orders.isLoading}
          isError={orders.isError}
          error={orders.error}
          onRetry={() => void orders.refetch()}
          errorTitle="Could not load the open orders"
          skeleton={<SkeletonTable cols={3} rows={4} />}
          isEmpty={rows.length === 0}
          empty={
            <EmptyState icon="inbox" title="No open orders">
              {supplier.name} has no order waiting, so there is nothing to move.
            </EmptyState>
          }
        >
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-ink2">
              <Icon name="orders" className="ic-sm" />
              {total > rows.length
                ? `${ordersText(total)} are open. The oldest ${rows.length} move in this run.`
                : `${ordersText(total)} open, oldest first.`}
            </p>
            <RerouteOrderList orders={rows} />
            <SelectField
              label="Move them to"
              selectWrapClassName="w-full"
              value={targetId}
              disabled={running || targets.length === 0}
              hint={
                targets.length === 0
                  ? 'No other supplier is enabled and up.'
                  : `Only enabled suppliers that are not down are listed (up to ${REROUTE_LIMIT} orders per run).`
              }
              options={[
                { value: '', label: 'Choose a supplier…' },
                ...targets.map((candidate) => ({
                  value: candidate.id,
                  label: candidate.health === 'degraded' ? `${candidate.name} (degraded)` : candidate.name,
                })),
              ]}
              onChange={(event) => {
                setTargetId(event.target.value);
                setError(null);
              }}
            />
          </div>
        </QueryState>
      )}
    </Modal>
  );
}

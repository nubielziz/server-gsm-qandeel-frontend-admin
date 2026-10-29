// OrdersHeader: the page title with the open and past-SLA counts, the keyboard hint, and the page's two actions. Ports the
// `head` of pageOrders in 41-p-orders.js, plus the Bulk reply button the map adds.
import { Button, Icon, Kbd, PageHeader } from '@/components/ui';
import type { OrderGrants } from '../hooks/useOrderGrants';

export interface OrdersHeaderProps {
  grants: OrderGrants;
  open: number | undefined;
  pastSla: number | undefined;
  /** False when no order matches, so there is nothing to export. */
  canExport: boolean;
  exporting: boolean;
  onBulkReply: () => void;
  onExport: () => void;
}

export function OrdersHeader({
  grants,
  open,
  pastSla,
  canExport,
  exporting,
  onBulkReply,
  onExport,
}: OrdersHeaderProps) {
  const lock = grants.needs('orders:update');
  return (
    <PageHeader
      title="Orders"
      sub={
        <>
          {open !== undefined && `${open} open${pastSla ? `, ${pastSla} past SLA` : ''}. `}
          Press <Kbd>j</Kbd> <Kbd>k</Kbd> to move, <Kbd>Enter</Kbd> to open.
        </>
      }
      actions={
        <>
          <Button disabled={lock.disabled} title={lock.title} onClick={onBulkReply}>
            <Icon name="send" className="ic-sm" />
            Bulk reply
          </Button>
          <Button disabled={!canExport} loading={exporting} onClick={onExport}>
            <Icon name="download" className="ic-sm" />
            Export CSV
          </Button>
        </>
      }
    />
  );
}

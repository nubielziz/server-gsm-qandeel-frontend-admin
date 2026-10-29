// OrderResult: what the buyer received (a completed order) or why the order was cancelled (a rejected one), and the result
// file when the supplier sent one. Ports the `result` block of orderDrawer in 41-p-orders.js.
import { Icon } from '@/components/ui';
import { orderFileUrl } from '../api';
import { rejectionReason } from '../lib/events';
import type { Order, OrderEvent } from '../types';

export interface OrderResultProps {
  order: Order;
  /** The timeline, for the reason of a rejection. */
  events: readonly OrderEvent[] | undefined;
  /** The staff member may download files. */
  canDownload: boolean;
}

export function OrderResult({ order, events, canDownload }: OrderResultProps) {
  const who = order.channel === 'b2c' ? 'customer' : 'merchant';
  if (order.status === 'completed') {
    const { code, comment, fileId } = order.result;
    return (
      <div className="mb-4">
        <h3 className="mb-1.5 text-xs font-medium text-ink3">Result sent to {who}</h3>
        <p className="rounded-md border border-line bg-sunken p-2.5 text-sm">{code ?? ''}</p>
        {comment && <p className="mt-1.5 text-xs text-ink2">{comment}</p>}
        {fileId !== null && canDownload && (
          <a
            className="link mt-1.5 inline-flex items-center gap-1 text-sm"
            href={orderFileUrl(fileId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="download" className="ic-sm" />
            Download the result file
          </a>
        )}
      </div>
    );
  }
  if (order.status === 'rejected') {
    return (
      <div className="mb-4">
        <h3 className="mb-1.5 text-xs font-medium text-ink3">
          {order.channel === 'b2c' ? 'Cancelled' : 'Rejected'}
        </h3>
        <p className="rounded-md border border-line bg-sunken p-2.5 text-sm">
          {rejectionReason(events, order.result)}
        </p>
      </div>
    );
  }
  return null;
}

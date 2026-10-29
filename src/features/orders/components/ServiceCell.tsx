// ServiceCell: the "Service / input" column. Ports the render of orderCols in 41-p-orders.js: the service with its type,
// the quantity when there is more than one, and the input below in mono.
import { TypeTag } from '@/components/ui';
import { fmtImei } from '@/lib/format';
import { TYPE_LABEL } from '../lib/status';
import type { Order } from '../types';

export function ServiceCell({ order }: { order: Order }) {
  return (
    <span className="block max-w-[260px]">
      <span className="flex items-center gap-1.5">
        <TypeTag>{TYPE_LABEL[order.service.type]}</TypeTag>
        <span className="truncate">{order.service.name}</span>
        {order.quantity > 1 && <span className="text-xs text-ink3">×{order.quantity}</span>}
      </span>
      <span className="mono block truncate text-2xs text-ink3">{fmtImei(order.imei)}</span>
    </span>
  );
}

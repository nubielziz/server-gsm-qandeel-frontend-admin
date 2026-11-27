// ServiceCells: the three columns Type, Service Name and Input of the Orders table. They replace the one "Service / input" column of
// orderCols in 41-p-orders.js (decision 037): the type tag, the whole service name and the order's own input each read at a glance.
import { TypeTag } from '@/components/ui';
import { fmtImei } from '@/lib/format';
import { TYPE_LABEL } from '../lib/status';
import type { Order } from '../types';

/** The Type column: the kit's tag for the kind of service (IMEI, Server, Remote, File). */
export function TypeCell({ order }: { order: Order }) {
  return <TypeTag>{TYPE_LABEL[order.service.type]}</TypeTag>;
}

/**
 * The Service Name column: the full name, wrapped onto as many lines as it needs. It is never cut off, so the owner can tell two
 * services with the same first words apart.
 */
export function ServiceNameCell({ order }: { order: Order }) {
  return <span className="block break-words leading-5">{order.service.name}</span>;
}

/**
 * The Input column: the order's main input (an IMEI, an account, a serial number or a model) in the mono face, and "×N" after it
 * when the order has more than one unit. A long input is cut at the column's width and shown whole in its tooltip.
 */
export function InputCell({ order }: { order: Order }) {
  const input = fmtImei(order.imei);
  return (
    <span className="flex max-w-[220px] items-baseline gap-1.5">
      {input === '' ? (
        <span className="text-ink3">–</span>
      ) : (
        <span className="mono truncate" title={input}>
          {input}
        </span>
      )}
      {order.quantity > 1 && (
        <span className="flex-none text-xs text-ink3" title={`Quantity ${order.quantity}`}>
          ×{order.quantity}
        </span>
      )}
    </span>
  );
}

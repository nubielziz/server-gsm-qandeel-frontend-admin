// HeldHead: the top of a held order's card: the order, the service, what was captured and how, the device and IMEI, and the
// risk score with how long the customer has waited. Ports the first block of `heldCard` in 54-p-risk.js.
import { cx, ScoreMeter } from '@/components/ui';
import { ago, fmtImei } from '@/lib/format';
import { amountText, LONG_WAIT_MS, methodText, waitMs } from '../lib/queue';
import type { HeldOrder } from '../types';
import { OrderLink } from './OrderLink';

export function HeldHead({ order, now }: { order: HeldOrder; now: number }) {
  const waiting = waitMs(order.paidAt, now) > LONG_WAIT_MS;
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-line p-3.5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <OrderLink id={order.orderId} />
          <span className="font-medium">{order.service.name}</span>
        </p>
        <p className="mt-0.5 text-sm text-ink2">
          {amountText(order)} by {methodText(order.paymentMethod)}
          {order.device && ` · ${order.device}`} · <span className="mono">{fmtImei(order.imei)}</span>
        </p>
      </div>
      <div className="text-end">
        <p className="text-xs text-ink3">Risk score</p>
        <ScoreMeter score={order.score} />
        <p className={cx('mt-0.5 text-xs', waiting ? 'font-medium text-crit-fg' : 'text-ink3')}>
          Paid {ago(order.paidAt, now)}
          {waiting && ', the customer is waiting'}
        </p>
      </div>
    </div>
  );
}

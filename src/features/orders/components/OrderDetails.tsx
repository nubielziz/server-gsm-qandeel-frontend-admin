// OrderDetails: the facts of the drawer: who ordered, what, the input, the supplier and the SLA. Ports the `dl` of orderDrawer in
// 41-p-orders.js. The SLA row is display maths from the creation time and the service's target; the files, when the staff member
// may read them, are plain download links (`GET /admin/files/:id`).
import { Link } from 'react-router';
import { CopyButton, Icon, KeyValue, TypeTag } from '@/components/ui';
import type { Id } from '@/lib/api';
import { dur, fmtImei, maskEmail } from '@/lib/format';
import { orderFileUrl } from '../api';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { ageText, slaMs, slaView } from '../lib/sla';
import { INPUT_LABEL, isHeld, TYPE_LABEL } from '../lib/status';
import type { Order } from '../types';

// The SLA sentence: target and age for an open order (with "late by"), target and time taken for a closed one.
function slaText(order: Order, now: number): string {
  if (isHeld(order)) return 'Clock starts when it is approved';
  const view = slaView(order, now);
  const target = ageText(slaMs(order));
  if (view.kind === 'done')
    return `${target} target, finished in ${view.took === null ? '–' : dur(view.took)}`;
  const base = `Target ${target}, now ${ageText(view.age)}`;
  return view.kind === 'late' ? `${base} (late by ${ageText(view.over)})` : base;
}

function FileLink({ id, allowed }: { id: Id; allowed: boolean }) {
  if (!allowed) return <span className="text-ink3">You need the files:read permission</span>;
  return (
    <a
      className="link inline-flex items-center gap-1"
      href={orderFileUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon name="download" className="ic-sm" />
      Download
    </a>
  );
}

export interface OrderDetailsProps {
  order: Order;
  now: number;
  grants: OrderGrants;
}

export function OrderDetails({ order, now, grants }: OrderDetailsProps) {
  const { service, customer, client, supplier } = order;
  const device = typeof order.inputs?.device === 'string' ? order.inputs.device : null;
  const files = grants.can('files:read');
  return (
    <KeyValue
      className="mb-5"
      rows={[
        customer
          ? [
              'Customer',
              <>
                <Link className="link" to={`/customers/${customer.id}`}>
                  {customer.name}
                </Link>{' '}
                <span className="text-ink3">· storefront</span>
                <p className="text-xs text-ink3">{maskEmail(customer.email)}</p>
              </>,
            ]
          : client && [
              'Merchant',
              <Link className="link" to={`/merchants/${client.id}`}>
                {client.name}
              </Link>,
            ],
        [
          'Service',
          <>
            <TypeTag>{TYPE_LABEL[service.type]}</TypeTag> {service.name}
            {order.quantity > 1 && <span className="text-ink3"> × {order.quantity}</span>}
          </>,
        ],
        [
          INPUT_LABEL[service.type],
          <>
            <span className="mono">{fmtImei(order.imei)}</span>{' '}
            <CopyButton value={order.imei} label="input" />
          </>,
        ],
        device ? ['Device', device] : null,
        [
          'Supplier',
          supplier ? (
            <>
              {supplier.name}
              <p className="text-xs text-ink3">
                {order.supplierRef && (
                  <>
                    Ref <span className="mono">{order.supplierRef}</span> ·{' '}
                  </>
                )}
                {order.attempts} {order.attempts === 1 ? 'attempt' : 'attempts'}
              </p>
            </>
          ) : (
            <span className="text-ink3">Not sent yet</span>
          ),
        ],
        ['SLA', slaText(order, now)],
        order.inputFileId !== null
          ? ['Input file', <FileLink id={order.inputFileId} allowed={files} />]
          : null,
        order.clientNote ? ['Note from the buyer', order.clientNote] : null,
        order.adminNote ? ['Internal note', order.adminNote] : null,
      ]}
    />
  );
}

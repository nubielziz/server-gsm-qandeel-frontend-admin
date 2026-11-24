// OrderDetails: the facts of the drawer: who ordered, what, the input, the answers to the service's custom fields, the supplier and the
// SLA. Ports the `dl` of orderDrawer in 41-p-orders.js. The SLA row is display maths from the creation time and the service's target; the
// files, when the staff member may read them, are plain download links (`GET /admin/files/:id`).
import { Link } from 'react-router';
import { CopyButton, Icon, KeyValue, TypeTag } from '@/components/ui';
import { accountPath } from '@/features/accounts';
import type { Id } from '@/lib/api';
import { dur, fmtImei, hasAccountName, maskedAccountLabel, maskEmail } from '@/lib/format';
import { orderFileUrl } from '../api';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { ageText, slaMs, slaView } from '../lib/sla';
import { INPUT_LABEL, isHeld, TYPE_LABEL } from '../lib/status';
import type { Order, OrderAnswer } from '../types';

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
  /** What the buyer answered to the service's custom fields, label then value; empty until the single-order read has arrived. */
  answers?: readonly OrderAnswer[];
  now: number;
  grants: OrderGrants;
}

/**
 * The answers to list under the main input row. When one of them is the main input itself (the order's input is the value of a
 * custom field) it is left out, so the same value is not shown twice: the first answer whose text is the order's input, trimmed.
 */
function answersBesideInput(order: Order, answers: readonly OrderAnswer[]): OrderAnswer[] {
  const input = order.imei.trim();
  const same = input === '' ? -1 : answers.findIndex((answer) => answer.value.trim() === input);
  return answers.filter((_, index) => index !== same);
}

export function OrderDetails({ order, answers = [], now, grants }: OrderDetailsProps) {
  const { service, account, supplier } = order;
  const files = grants.can('files:read');
  return (
    <KeyValue
      className="mb-5"
      rows={[
        [
          'Account',
          <>
            <Link className="link" to={accountPath(account.id)}>
              {maskedAccountLabel(account)}
            </Link>{' '}
            <span className="text-ink3">
              · {account.rank.name}
              {account.guest ? ', guest' : ''}
            </span>
            {hasAccountName(account) && <p className="text-xs text-ink3">{maskEmail(account.email)}</p>}
          </>,
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
        // An answer is text the buyer typed, in any script, and its label may come from a supplier's text: each reads in its own
        // direction, and a multi-line answer keeps its line breaks.
        ...answersBesideInput(order, answers).map(
          (answer) =>
            [
              <span dir="auto">{answer.label}</span>,
              <span dir="auto" className="whitespace-pre-line">
                {answer.value}
              </span>,
            ] as const,
        ),
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
        order.adminNote ? ['Internal note', order.adminNote] : null,
      ]}
    />
  );
}

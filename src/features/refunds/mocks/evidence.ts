// Mock evidence pack of a dispute. Ports `evidenceFor` and `consentsFor` of the demo (53-p-refunds.js, 12-state-b2c.js), which
// compiled the pack in the browser from the order, the customer's other orders, support tickets and the legal documents.
// In the real API the server builds the pack and weighs the case; the mock stands in for that (decision 014).
import { fmtDate, lm, maskEmail } from '@/lib/format';
import type { EvidenceItem, EvidenceStrength } from '../types';
import type { DemoCustomer, DemoLegal, DemoOrder, DemoTicket } from './demoTypes';

const DAY = 86_400_000;

/** What the pack is built from, besides the order and the customer. */
export type EvidenceContext = {
  orders: readonly DemoOrder[];
  tickets: readonly DemoTicket[];
  legal: readonly DemoLegal[];
};

// The terms the customer accepted at checkout and the address they were recorded from (the demo made both up from the order).
function consentsFor(order: DemoOrder, customer: DemoCustomer, legal: readonly DemoLegal[]) {
  const digits = parseInt(order.token.replace(/\D/g, '').slice(0, 3) || '24', 10);
  const doc = (type: string) => {
    const found = legal.find((x) => x.type === type && x.current && x.lang === 'EN');
    return found ? `${type} v${found.version}` : type;
  };
  const what = [
    doc('Terms of service'),
    doc('Privacy policy'),
    doc('Refund policy'),
    'Digital service starts now, right of withdrawal is waived',
  ];
  if (customer.optIn) what.push('Marketing emails (opt-in)');
  return { what, ip: `203.0.113.${(digits % 200) + 20}` };
}

/** The six lines of the pack with the demo's words, and how strong the case looks (the demo's weights: 8 is strong, 5 is fair). */
export function buildEvidence(
  order: DemoOrder,
  customer: DemoCustomer,
  { orders, tickets, legal }: EvidenceContext,
): { items: EvidenceItem[]; strength: EvidenceStrength } {
  const gross = order.gross ?? order.price;
  const paid = lm(gross, order.cur ?? 'USD', order.fx ?? 1);
  const consents = consentsFor(order, customer, legal);
  const prior = orders.filter(
    (x) =>
      x.cid === customer.id && x.id !== order.id && x.status === 'completed' && x.pay.status === 'captured',
  );
  const contacts = tickets.filter(
    (t) =>
      t.oid === order.id ||
      (t.who.type === 'customer' &&
        t.who.id === customer.id &&
        Math.abs(t.created - order.created) < 5 * DAY),
  );
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const lines: (EvidenceItem & { weight: number })[] = [
    {
      key: 'payment',
      title: 'Payment record',
      ok: true,
      weight: 1,
      body: `${order.pay.brand}, ${paid} captured ${fmtDate(order.created)}. Gateway ref ${order.pay.ref}.`,
    },
    {
      key: 'three_ds',
      title: '3D Secure authentication',
      ok: order.pay.threeDS,
      weight: order.pay.threeDS ? 3 : 0,
      body: order.pay.threeDS
        ? 'The cardholder passed the bank’s own check. For fraud disputes this usually shifts liability to the bank.'
        : 'No 3D Secure on this payment. The bank can claim the cardholder did not authorise it.',
    },
    {
      key: 'delivery',
      title: 'Proof of delivery',
      ok: order.doneAt !== null,
      weight: order.doneAt ? 3 : 0,
      body: order.doneAt
        ? `Result delivered ${fmtDate(order.doneAt)} to ${maskEmail(customer.email)}: “${(order.reply || 'Unlock confirmed').slice(0, 90)}”`
        : 'Not delivered yet.',
    },
    {
      key: 'consents',
      title: 'Terms the customer accepted',
      ok: true,
      weight: 2,
      body: `${consents.what.join('; ')}. Recorded from IP ${consents.ip}.`,
    },
    {
      key: 'history',
      title: 'Order history',
      ok: prior.length > 0,
      weight: prior.length > 0 ? 1 : 0,
      body:
        prior.length > 0
          ? `${plural(prior.length, 'earlier paid order')} from the same customer that ${prior.length === 1 ? 'was' : 'were'} not disputed.`
          : 'First order from this customer.',
    },
    {
      key: 'contact',
      title: 'Customer contact',
      ok: contacts.length === 0,
      weight: contacts.length > 0 ? 0 : 1,
      body:
        contacts.length > 0
          ? `${plural(contacts.length, 'support ticket')} around this order: ${contacts.map((t) => t.subject).join('; ')}.`
          : 'The customer never contacted support about this order.',
    },
  ];
  const score = lines.reduce((total, line) => total + line.weight, 0);
  return {
    items: lines.map(({ weight: _weight, ...item }) => item),
    strength: score >= 8 ? 'strong' : score >= 5 ? 'fair' : 'weak',
  };
}

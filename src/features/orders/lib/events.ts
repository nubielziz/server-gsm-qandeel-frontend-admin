// The order's timeline as the drawer shows it: the words of each event, who did it, and the colour of its node. Ports
// the `timeline(o.events)` call of orderDrawer (41-p-orders.js) and the node colours of timeline() in 20-ui.js. The demo
// stored a sentence per event; the API stores a type and `data`, so the sentence is built here when `data.message` is missing.
import type { TimelineEvent, TimelineKind } from '@/components/ui';
import type { EventActorType, OrderEvent } from '../types';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// Event types the timeline colours; the API may send them with an `order_` or `order.` prefix.
const KINDS: readonly TimelineKind[] = ['completed', 'settle', 'review', 'rejected', 'release', 'retry'];

function baseType(type: string): string {
  return type.toLowerCase().replace(/^order[._]/, '');
}

/** The node colour of an event type; any other type gets the neutral grey. */
export function eventKind(type: string): TimelineKind | undefined {
  return KINDS.find((kind) => kind === baseType(type));
}

// What an event type says when it carries no sentence of its own. A function gets the event's `data` fields.
const LABELS: Record<string, (data: OrderEvent['data']) => string> = {
  created: (data) => (text(data.source) ? `Order received via ${text(data.source)}` : 'Order received'),
  hold: () => 'Money held from the buyer',
  dispatch: (data) => (text(data.supplier) ? `Sent to ${text(data.supplier)}` : 'Sent to the supplier'),
  ack: (data) =>
    text(data.ref) ? `Accepted by the supplier, ref ${text(data.ref)}` : 'Accepted by the supplier',
  accepted: () => 'Accepted by the team, moved to Processing',
  completed: () => 'Completed',
  settle: () => 'Settled to revenue',
  rejected: (data) => text(data.reason) || 'Rejected',
  release: () => 'Money released back to the buyer',
  refund: (data) => (text(data.reason) ? `Refunded: ${text(data.reason)}` : 'Refunded'),
  retry: () => 'Sent to the supplier again',
  review: (data) => text(data.reason) || 'Stopped for review',
  reopened: (data) => (text(data.reason) ? `Reopened: ${text(data.reason)}` : 'Reopened, back to Processing'),
  supplier_changed: () => 'Supplier changed',
  verification: (data) => (text(data.decision) ? `Verification: ${text(data.decision)}` : 'Verification'),
  note: (data) => text(data.body) || 'Internal note',
  paid: () => 'Payment captured',
  risk: () => 'Risk check',
  notify: () => 'Buyer notified',
  dispute: () => 'Dispute',
};

/** "supplier_changed" reads "Supplier changed" for a type the console has no sentence for. */
function humanize(type: string): string {
  const words = baseType(type)
    .replace(/[_.-]+/g, ' ')
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Event';
}

/** One sentence for the timeline: the server's `data.message`, else the type's own words with the fields it carries. */
export function eventText(event: Pick<OrderEvent, 'type' | 'data'>): string {
  const message = text(event.data?.message);
  if (message) return message;
  const label = LABELS[baseType(event.type)];
  return label ? label(event.data ?? {}) : humanize(event.type);
}

const ACTOR_LABEL: Record<EventActorType, string> = {
  staff: 'Team member',
  client: 'Merchant',
  customer: 'Customer',
  system: 'System',
  supplier: 'Supplier',
};

/** Who did it: the name the server sent, else the kind of actor. */
export function eventBy(event: Pick<OrderEvent, 'actor'>): string {
  return text(event.actor?.name) || ACTOR_LABEL[event.actor?.type] || 'System';
}

/** The events in the shape the kit's Timeline takes (it sorts them, oldest first). */
export function toTimelineEvents(events: readonly OrderEvent[]): TimelineEvent[] {
  return events.map((event) => ({
    id: event.id,
    at: event.createdAt,
    kind: eventKind(event.type),
    text: eventText(event),
    by: eventBy(event),
  }));
}

/** Why a rejected order was rejected: the newest "rejected" event's reason, else the result the buyer got. */
export function rejectionReason(
  events: readonly OrderEvent[] | undefined,
  result: { code: string | null; comment: string | null },
): string {
  const rejected = [...(events ?? [])]
    .filter((event) => baseType(event.type) === 'rejected')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  return (rejected ? eventText(rejected) : '') || text(result.code) || text(result.comment);
}

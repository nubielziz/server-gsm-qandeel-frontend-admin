// How the screen names an order's state, and the demo's tabs mapped onto API filters. Ports ORDER_STATUS and OPEN of
// 10-data.js, isOpen of 11-state.js and the tab list of pageOrders in 41-p-orders.js. The API says `status` + `queue`;
// the screen keeps the demo's five words (MISMATCHES M20).
import type { BadgeTone, IconName } from '@/components/ui';
import type { Order, OrderChannel, OrderListFilters, OrderQueue, ServiceType } from '../types';

/** The five states the demo shows. */
export type DisplayStatus = 'queued' | 'processing' | 'review' | 'completed' | 'rejected';

/** The queues a person has to look at: the demo's "Needs review". */
export const REVIEW_QUEUES: readonly OrderQueue[] = ['manual', 'needs_attention', 'verification', 'review'];

/** True while the order can still be changed: not completed and not rejected (the demo's `isOpen`). */
export function isOpen(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'processing';
}

/** A paid storefront order the risk engine stopped before it reached a supplier. */
export function isHeld(order: Pick<Order, 'channel' | 'queue'>): boolean {
  return order.channel === 'b2c' && order.queue === 'review';
}

/**
 * The demo's word for the order. A review queue wins over everything, because someone has to act on it (a completed
 * order waiting for a verification decision still "needs review"); then the end states; then waiting to be sent;
 * everything else is processing.
 */
export function displayStatus(order: Pick<Order, 'status' | 'queue'>): DisplayStatus {
  if (order.queue && REVIEW_QUEUES.includes(order.queue)) return 'review';
  if (order.status === 'completed') return 'completed';
  if (order.status === 'rejected') return 'rejected';
  if (order.queue === 'pending' || order.status === 'pending') return 'queued';
  return 'processing';
}

/** The badge of each state: word, tone and icon (status is never colour alone). */
export const STATUS_BADGE: Readonly<
  Record<DisplayStatus, { label: string; tone: BadgeTone; icon: IconName }>
> = {
  queued: { label: 'Queued', tone: 'neutral', icon: 'clock' },
  processing: { label: 'Processing', tone: 'neutral', icon: 'refresh' },
  review: { label: 'Needs review', tone: 'serious', icon: 'alert' },
  completed: { label: 'Completed', tone: 'good', icon: 'checkCircle' },
  rejected: { label: 'Rejected', tone: 'crit', icon: 'xCircle' },
};

/** The queue in words, shown under the "Needs review" badge so the reason is visible at a glance. */
export const QUEUE_LABEL: Readonly<Record<OrderQueue, string>> = {
  pending: 'Waiting to be sent',
  manual: 'Manual order',
  needs_attention: 'Needs attention',
  verification: 'Verification',
  review: 'Held by risk',
};

// ---- Tabs ----

export type OrderTab = 'open' | 'review' | 'queued' | 'processing' | 'completed' | 'rejected' | 'all';

/** The demo's tabs, in its order. */
export const ORDER_TABS: readonly { id: OrderTab; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'review', label: 'Needs review' },
  { id: 'queued', label: 'Queued' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

/** The demo opens on Open: the screen starts on what is waiting (DESIGN.md "Queue first"). */
export const DEFAULT_TAB: OrderTab = 'open';

/** The tabs that list orders still in the queue; they start with the oldest order, the one waiting longest. */
export const QUEUE_TABS: readonly OrderTab[] = ['open', 'review', 'queued', 'processing'];

export function isOrderTab(value: unknown): value is OrderTab {
  return ORDER_TABS.some((tab) => tab.id === value);
}

/**
 * The tabs whose rows all show the same badge, so the table drops its Status column (the tab already says it). The
 * others keep it: Processing and Completed also hold orders stopped in a review queue, and on Needs review the badge's
 * queue line (manual, needs attention, verification, held by risk) is the reason to look.
 */
export const SINGLE_STATUS_TABS: readonly OrderTab[] = ['queued', 'rejected'];

/** The API filter behind a tab (MISMATCHES M20): Open is pending + processing, Needs review is the four review queues. */
export function tabFilters(tab: OrderTab): OrderListFilters {
  switch (tab) {
    case 'open':
      return { status: ['pending', 'processing'] };
    case 'review':
      return { queue: [...REVIEW_QUEUES] };
    case 'queued':
      return { queue: 'pending' };
    case 'processing':
      return { status: 'processing' };
    case 'completed':
      return { status: 'completed' };
    case 'rejected':
      return { status: 'rejected' };
    case 'all':
      return {};
  }
}

// ---- Words for other fields ----

/** Service types as the demo spells them (the API sends them in lower case). */
export const TYPE_LABEL: Readonly<Record<ServiceType, string>> = {
  imei: 'IMEI',
  server: 'Server',
  remote: 'Remote',
  file: 'File',
};

export const SERVICE_TYPES: readonly ServiceType[] = ['imei', 'server', 'remote', 'file'];

/** What the main input is called for each type (the drawer's second row). */
export const INPUT_LABEL: Readonly<Record<ServiceType, string>> = {
  imei: 'IMEI',
  server: 'Account',
  remote: 'Serial',
  file: 'Model',
};

/** How an order arrived, in the demo's words; a source the console does not know is shown as it is. */
export function sourceLabel(source: string): string {
  const known: Record<string, string> = {
    dhru: 'Dhru API',
    v1: 'REST API',
    portal: 'Portal',
    store: 'Storefront',
    admin: 'Admin console',
  };
  return known[source.toLowerCase()] ?? source;
}

/** The id as the demo shows it: `ORD-48100` for a merchant order, `SF-20490` for a storefront one. */
export function orderLabel(order: Pick<Order, 'id' | 'channel'>): string {
  return `${order.channel === 'b2c' ? 'SF' : 'ORD'}-${order.id}`;
}

export const CHANNEL_OPTIONS: readonly { value: OrderChannel | ''; label: string }[] = [
  { value: '', label: 'All channels' },
  { value: 'b2b', label: 'Merchants (API and portal)' },
  { value: 'b2c', label: 'Storefront' },
];

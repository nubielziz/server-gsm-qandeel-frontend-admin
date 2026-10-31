// Addresses the Orders & suppliers tab links to: the Orders page filtered to orders past SLA (route group orders) and the
// risk review queue (route group risk). The tab has no address parameters of its own.
import { ordersListPath, type OrderFilters } from '@/features/orders';

/** One tab of the Orders page. The orders feature does not export the type by name, so it is read from its filters. */
type OrdersTab = OrderFilters['tab'];

// The Orders tab that lists the same orders as a "past SLA by status" row. The server names a row by the order status or
// queue ("processing", "needs_attention"); "needs_attention" has no tab of its own, so it opens "Needs review", which
// also holds the manual, verification and held-by-risk queues (so that list can be longer than the row's count).
const TAB_OF_STATUS: Readonly<Record<string, OrdersTab>> = {
  pending: 'queued',
  processing: 'processing',
  needs_attention: 'review',
  completed: 'completed',
  rejected: 'rejected',
};

/** The Orders tab for a status row, or undefined when the Orders page has no tab for that word. */
export function ordersTabFor(status: string): OrdersTab | undefined {
  return Object.hasOwn(TAB_OF_STATUS, status) ? TAB_OF_STATUS[status] : undefined;
}

/**
 * The Orders page showing only orders past SLA. With a status it also opens the tab for that status when the Orders page
 * has one; without it (the total) the page keeps its default tab. Filtering is the Orders page's job.
 */
export function pastSlaPath(status?: string): string {
  const tab = status === undefined ? undefined : ordersTabFor(status);
  return ordersListPath(tab ? { tab, pastSla: true } : { pastSla: true });
}

/** The Risk page on its review queue, where orders held by the risk rules wait for a decision. */
export const RISK_QUEUE_PATH = '/risk?tab=queue';

// Small pure helpers of the Order pipeline card: the service type words, the "problems first" order of the success and
// failure table, and a count with its noun. They read the states the server sent and decide none.
import { TYPE_LABEL, type ServiceType } from '@/features/orders';
import { num } from '@/lib/format';
import { problemRank, sortProblemsFirst } from '../../lib';
import type { MetricState, ServiceTypeHealth } from '../../types';

/** The service type in the orders feature's words ("IMEI", "Server"). A type the console does not know prints as sent. */
export function serviceTypeLabel(type: string): string {
  return Object.hasOwn(TYPE_LABEL, type) ? TYPE_LABEL[type as ServiceType] : type;
}

/** Of two measure states, the one that is worse by the page's problem order (critical, warn, unknown, ok). */
export function worseState(a: MetricState, b: MetricState): MetricState {
  return problemRank(b) < problemRank(a) ? b : a;
}

/** Service types with the worst success or failure state first. Types with the same state keep the server's order. */
export function sortServiceTypes(rows: readonly ServiceTypeHealth[]): ServiceTypeHealth[] {
  return sortProblemsFirst(rows, (row) => worseState(row.success.state, row.failure.state));
}

/** A count with its noun, so a number never stands without a unit: "1 order", "23 orders". */
export function ordersCount(count: number): string {
  return `${num(count)} ${count === 1 ? 'order' : 'orders'}`;
}

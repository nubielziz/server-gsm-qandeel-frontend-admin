// Query keys of the refunds reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what a
// refund or dispute action makes stale. React Query matches keys as prefixes.
import { ORDER_STALE_KEYS } from '@/features/orders';
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY, type InvalidateTarget } from '@/lib/query';
import type { Dispute, Refund } from '../types';

/** Every non-Refine read of this feature. */
export const REFUNDS_KEY = ['api', 'refunds'] as const;

/** The counts and totals of the strip and the tab chips. */
export const FIGURES_KEY = [...REFUNDS_KEY, 'figures'] as const;

/** The payments report (the Payments tab). */
export const REPORT_KEY = [...REFUNDS_KEY, 'report'] as const;

/** How often the lists and figures ask again while the page is open (new requests and disputes arrive by themselves). */
export const REFRESH_MS = 30_000;

/**
 * The reads an action makes stale besides Refine's own: the figures and the report, the dashboard with the sidebar counts,
 * and the order's timeline and ledger entries (an approved or accepted refund posts to the order).
 */
export const STALE_KEYS: QueryKey[] = [REFUNDS_KEY, DASHBOARD_KEY, ...ORDER_STALE_KEYS];

/** The Refine targets of a decided refund: its lists and record, and its order (the payment and timeline changed). */
export function staleRefund(refund: Pick<Refund, 'id' | 'orderId'>): InvalidateTarget[] {
  return [
    { resource: 'refunds', id: refund.id },
    { resource: 'orders', id: refund.orderId },
  ];
}

/** The Refine targets of an answered dispute: its lists and record, and its order. */
export function staleDispute(dispute: Pick<Dispute, 'id' | 'orderId'>): InvalidateTarget[] {
  return [
    { resource: 'disputes', id: dispute.id },
    { resource: 'orders', id: dispute.orderId },
  ];
}

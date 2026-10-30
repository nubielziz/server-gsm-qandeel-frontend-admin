// Small readings of a refund row for the table and the dialogs: who acted, when, and whether the order was delivered.
// Ports the "When" column and the `delivered` check of 53-p-refunds.js. Display only; the server decides every refund.
import type { IsoDateTime } from '@/lib/api';
import type { Refund } from '../types';

/** True for a refund the system opened by itself (a failed unlock is refunded without a person). */
export function isAutomatic(refund: Pick<Refund, 'requestedBy'>): boolean {
  return refund.requestedBy.type === 'system';
}

/** The name under the "When" column: the person who decided it, else who asked ("Customer", "System", a staff name). */
export function refundActor(refund: Pick<Refund, 'approvedBy' | 'requestedBy'>): string {
  if (refund.approvedBy) return refund.approvedBy.name;
  const { type, name } = refund.requestedBy;
  if (name) return name;
  return type === 'customer' ? 'Customer' : type === 'system' ? 'System' : 'Staff';
}

/** When it last changed: the moment it was completed, else when it was opened. */
export function refundWhen(refund: Pick<Refund, 'completedAt' | 'createdAt'>): IsoDateTime {
  return refund.completedAt ?? refund.createdAt;
}

/** The supplier has delivered the result, so its cost is not coming back (the approve dialog warns about it). */
export function isDelivered(refund: Pick<Refund, 'order'>): boolean {
  return refund.order.deliveredAt !== null;
}

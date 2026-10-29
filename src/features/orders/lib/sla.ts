// SLA, age and "Late by" as the table and the drawer show them. Ports slaMs, ageMs and isBreach of 11-state.js, ageText of
// 20-ui.js and the numbers of slaCell in 41-p-orders.js. This is display maths from `createdAt` and the service's
// `slaMinutes`: it only draws a bar and a word. Whether an order counts as past SLA is the server's call (`pastSla` filter).
import type { Order } from '../types';
import { displayStatus, isOpen } from './status';

const MINUTE = 60_000;

/** The target time of the order's service in milliseconds. */
export function slaMs(order: Pick<Order, 'service'>): number {
  return order.service.slaMinutes * MINUTE;
}

/**
 * How long the order has existed (open) or took (closed), in milliseconds; `null` for a closed order that has no end
 * time. `now` comes from `useNow` so a screen stays consistent and testable.
 */
export function ageMs(
  order: Pick<Order, 'status' | 'createdAt' | 'completedAt'>,
  now: number,
): number | null {
  const created = Date.parse(order.createdAt);
  if (isOpen(order)) return Math.max(0, now - created);
  if (!order.completedAt) return null;
  return Math.max(0, Date.parse(order.completedAt) - created);
}

/** "<1m", "45m", "2h 5m", "3d 4h": the two largest units, with non-breaking spaces (the demo's `ageText`). */
export function ageText(ms: number): string {
  const nbsp = ' ';
  const minutes = Math.max(0, Math.round(ms / MINUTE));
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${minutes % 60 ? `${nbsp}${minutes % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? `${nbsp}${hours % 24}h` : ''}`;
}

/** What the SLA column draws for one order. */
export type SlaView =
  /** Closed: how long it took (`null` when the server sent no end time). */
  | { kind: 'done'; took: number | null }
  /** Waiting for a person: only the age, no bar (the clock is not the problem). */
  | { kind: 'review'; age: number }
  /** Past the target: the age and by how much, no bar (a full red bar adds nothing, DESIGN.md). */
  | { kind: 'late'; age: number; over: number }
  /** Inside the target: the age and a bar that fills toward it. `ratio` is 0 to 1. */
  | { kind: 'running'; age: number; sla: number; ratio: number };

export function slaView(order: Order, now: number): SlaView {
  const age = ageMs(order, now);
  if (!isOpen(order)) return { kind: 'done', took: age };
  const elapsed = age ?? 0;
  if (displayStatus(order) === 'review') return { kind: 'review', age: elapsed };
  const sla = slaMs(order);
  if (sla > 0 && elapsed >= sla) return { kind: 'late', age: elapsed, over: elapsed - sla };
  return { kind: 'running', age: elapsed, sla, ratio: sla > 0 ? elapsed / sla : 0 };
}

/** True for an open order that is not waiting for review and has outlived its target (the demo's `isBreach`). */
export function isLate(order: Order, now: number): boolean {
  return slaView(order, now).kind === 'late';
}

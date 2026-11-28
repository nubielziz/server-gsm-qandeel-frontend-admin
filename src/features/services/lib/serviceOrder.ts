// When the rows of the Pricing view can be dragged to a new place (decision 038). The grid is one flat list of the services of a kind, in the
// order merchants see (the group's position, then the service's), cut into pages by the server, so a drop is only safe where the list on screen is
// the WHOLE list of one group: only then does every service of the group have its place in front of the person, and the numbers that change are
// worked out over all of them. Nothing here reads the server.
import type { Id } from '@/lib/api';
import { dragState, type DragState } from './reorder';

/** What decides it. */
export type ServiceDragInput = {
  /** The lock of `catalog:update` as the grants give it. */
  lock: { disabled: boolean; title?: string };
  /** Positions are typed in the Order boxes and not saved: a drop would work on numbers the boxes do not show. */
  typedPositions: number;
  /** The search text of the address. */
  q: string;
  /** The group (category) of the address, if one is chosen. */
  group: Id | undefined;
  /** The page of the address, the rows on the page and the total the server counts for the list. */
  page: number;
  rows: number;
  total: number | undefined;
  /** The rows on screen are the page before, kept while the next one loads. */
  stale: boolean;
};

/**
 * Whether the Pricing view's rows can be dragged. The reasons, in the order they are told: a role without `catalog:update`,
 * positions typed and not saved, a search on, no group chosen, and a group with more services than the page shows (raise the page size, or
 * use the Order boxes). The list is always in position order: the grid asks for no other. A save that runs does not turn dragging off
 * (decision 042).
 */
export function serviceDragState(input: ServiceDragInput): DragState {
  const whole = !input.stale && input.page === 1 && input.total !== undefined && input.total === input.rows;
  return dragState([
    { when: input.lock.disabled, reason: input.lock.title ?? 'You cannot change the order', hint: true },
    { when: input.typedPositions > 0, reason: 'Save or clear the typed positions first', hint: true },
    { when: input.q !== '', reason: 'Clear the search to drag services', hint: true },
    { when: input.group === undefined, reason: 'Choose a group to drag its services', hint: true },
    {
      when: !whole,
      reason: input.stale
        ? 'Reading the services'
        : "Raise the page size until it holds all of the group's services, or type positions in the Order boxes",
      hint: !input.stale,
    },
  ]);
}

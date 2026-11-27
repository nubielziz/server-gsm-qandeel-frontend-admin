# 038 Drag and drop for the order of groups and services

**Context.** On 2026-11-27 the owner asked to drag, not to press arrows or type numbers, to set the order of groups (the Group view of the Product /
Services page) and of the services of a group (the Pricing view). Until then a group moved one place per click (one `PATCH /admin/service-categories/:id`
per group that changed, so a refused call left half a move) and a service moved by typed numbers in the Order boxes.

**Decision.**
- **One call per drop.** A drop and the up and down buttons of the Group view send ONE `POST /admin/service-categories/order` (`{ items: [{ id, sort }] }`,
  backend decision 078, all or none, answer `{ updated }`) with only the groups whose number changes. A drop in the Pricing view sends ONE
  `POST /admin/services/order` (decision 063) with the services whose number changes. The numbers are worked out by `reorderChanges`
  (`lib/reorder.ts`): the places keep their numbers, an item moved into a place takes it, a tie gets a number above the one before it, and the walk stops
  at the first item past the move that is already above (a move over one place is usually two writes). The server judges the result (422 on `items.N.id`).
- **The new order is shown at once** and given back on a refusal. `useReorder` holds the new order and numbers (`useHeldOrder`) while the call runs; on
  success the lists have been read again by the time the hold is let go, so nothing jumps; on a refusal or a failed call the hold is let go (and the group
  list is read again), and a toast says the server's own words (`refusalWords`: the messages of the fields, which a bare "Check the form" hides).
- **A grip, not the row.** The first cell of a row holds a grip button (six dots, "Drag <name>") and is the only part that starts a drag, so the rest of the row
  stays clickable and its text selectable. The table is `SortableTable` (`components/sortable`): the shared `DataTable` for loading, error and empty
  states and when there is nothing to drag; otherwise the same markup with the grip cell and one `DndContext`. The shared kit is not changed.
- **Library.** `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2 (peer: React 16.8 or later; the console is on 19). The
  classic packages, not the new `@dnd-kit/react`: the three the owner named. Pointer sensor (6 px before a press becomes a drag, so a click on the grip does
  nothing) and keyboard sensor with `sortableKeyboardCoordinates` (focus the grip, space or enter to pick up, arrows, space or enter to drop, escape to cancel). The
  vertical axis only (a 3-line modifier, so no `@dnd-kit/modifiers` package). English screen reader words (`dragAnnouncements`: "Picked up Apple, position 1 of 5.",
  "Apple is over Generic, position 3 of 5.", "Apple dropped at position 3 of 5.") and instructions, naming the place in the whole list.
- **The buttons stay**, as the keyboard and screen reader route that needs no pickup, and now use the same one-call save (`useGroupOrder.step`).
- **Dragging is off** (the grips are disabled, the reason is their title, and the same words are a short line above the table, so a keyboard or touch user
  reads it too): for a role without `catalog:update` (the lock the buttons show), while a save runs, and in the Group view while a search is on or while the
  list holds only some of the groups (the "Only the first N of M groups are listed" warning: a drop would be worked out over part of the order). The Group view's
  list is always in position order (nothing sorts it), so that case does not arise.
- **Pricing view: only a whole group.** The grid is one flat list of the services of a kind, in the order merchants see (the group's position, then the
  service's, then the name), cut into pages by the server. A drop is only safe where every service of the group is on screen: the numbers that change are worked
  out over the whole group, and a tie (all at 0, sorted by name) cannot be reordered inside a slice of it. So the grips come with "Set Order" and work when a
  group is chosen, no search is on, no typed position is waiting and the page holds the group in full (page 1, as many rows as the server counts:
  `serviceDragState`). Otherwise the line above the grid says what to do: choose a group, clear the search, save or clear the typed positions, or raise the page
  size (200 at most; a larger group keeps the Order boxes). Services never move between groups: the rows of one group only are draggable. The typed Order boxes
  and their Save order are unchanged.
- **Motion** (decision 028): the rows move with the library's transform and a transition of `--duration-base` and `--ease-glide`; with reduced motion there is no
  transition and no animated drop (`prefersReducedMotion`).

**Consequences.**
- `useMoveGroup` (one PATCH per group) is gone; `orderCategories` is the new API function (`@route POST /admin/service-categories/order`), with its mock.
- The first two cells of a Group row are now the grip and the tick box (the name is the third); the header reads "Drag to reorder" for a screen reader.
- Tests do not drag with a pointer (jsdom has no layout): they drop through the DndContext's own `onDragEnd` (`test/dnd.ts`), and `SortableTable.test.tsx` drives the
  real keyboard sensor with boxes given to the rows by index.

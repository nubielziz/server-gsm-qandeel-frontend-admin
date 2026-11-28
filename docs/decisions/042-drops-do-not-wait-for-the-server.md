# 042 A drop does not wait for the server

**Context.** On 2026-11-28 the owner said that dragging rows to set the order (decision 038) works, but that after every change the table "reloads to get new
data", which feels bad. Measured in a browser on the Group view and the Pricing view, after each drop:
- a line "Saving the new order." appeared above the table, which pushed the table down 26 to 34 px and let it jump back when the line went;
- every grip was turned off (grey) until the save AND the reads that followed it had ended, so the next row could not be dragged;
- the wait covered more than the save: the mutation waited for the lists to be read again (the group list, or the price grid and the dashboard);
- the Pricing view showed an "Order saved" toast for every drop.

**Decision.**
- **Nothing on screen waits for the server.** A drop shows its order at once, as before, and the grips stay on. The next drop is worked out on the order the
  last one left (`useReorder` keeps it), so a person drags one row after another.
- **The saves go out in order**, one call per drop as before (`POST /admin/service-categories/order`, `POST /admin/services/order`), each after the one
  before it has been answered. No body changes.
- **The lists are read again once, in the background**, 400 ms after the last save of a run of drops (`REFRESH_AFTER_MS`), not after each one, and no
  mutation waits for it (`useSaveGroupOrder` and `useSaveServiceOrder({ dropped: true })` invalidate nothing; `useGroupRefresh` and
  `useServiceOrderRefresh` do the read). The held order stays on screen until that read is in, so the table does not jump.
- **No line and no toast for a save that worked.** "Saving the new order" is gone from above the table and from the grips' title, and a drop in the Pricing
  view shows no "Order saved": the row that stays where it was dropped is the answer. The typed Order boxes and their Save order keep their toast. A
  screen reader still hears the library's "dropped at position N" and, in the Group view, "<name> moved to position N of M" after the save.
- **A refusal** (or a call that fails): the list goes back to the last order the server took, which is the stored order when it took none of the run; the
  drops made after the refused one are not sent, because they were worked out on an order that was never saved; the lists are read again at once; the
  toast says the server's own words, as before.
- The up and down buttons of the Group view use the same save, so they behave the same.

**Consequences.**
- `groupDragState` and `serviceDragState` no longer take `saving`. Dragging is still off for a role without `catalog:update`, during a search, for a
  partial list and, in the Pricing view, while positions are typed, no group is chosen or the page is not the whole group.
- Between a drop and the background read, the list on screen is the console's own (the order and the numbers it worked out). The read that follows is what
  shows a change another person made meanwhile.
- A view left within the 400 ms marks the lists stale at once, so the next view that shows them reads them again.
- This replaces the "Dragging is off while a save runs" rule and the "on success the lists have been read again by the time the hold is let go" wording of
  decision 038.

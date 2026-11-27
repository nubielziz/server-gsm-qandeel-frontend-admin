# 037 The Orders table shows the type, the whole service name and the input in their own columns

**Context.** The Orders table had one column "Service / input" (the demo's `orderCols` in `41-p-orders.js`): the type tag, the service name cut off at
260 px, the quantity, and the IMEI in small grey mono on a second line. On 2026-11-27 the owner asked to read the type and the whole service name at a
glance. Console only: the list row already carries `service.type`, `service.name`, `imei` and `quantity`, so no backend change.

**Decision.** Three columns take the place of the one, in this order, between Buyer and Status:

| column | cell | what it shows |
|---|---|---|
| Type | `TypeCell` | the kit's `TypeTag` for `order.service.type` (IMEI, Server, Remote, File) |
| Service Name | `ServiceNameCell` | the full name, wrapped onto as many lines as it needs; never cut off |
| Input | `InputCell` | the main input in the mono face (a 15-digit IMEI grouped as before by `fmtImei`; anything else as it is), then "×N" when the quantity is more than one |

- **Widths.** The Service Name column is `w-full min-w-[200px] py-2`: it takes the width the other columns leave, wraps inside it, and the rows grow
  taller instead of the name being cut. The other columns keep the width of their content, as before. Below the width where the table does not fit,
  the table's own wrapper scrolls sideways, as it did. The Supplier (below `xl`) and Profit (below `md`) columns hide as before.
- **Input.** The cell is at most 220 px wide: a very long input (an email, a pasted text) is cut there and shown whole in its tooltip. An order with
  no main input shows a dash instead of an empty cell. The cell has no copy button and no masking: it had none before. The quantity moved from
  beside the name to beside the input, because it counts units of the input.
- **Nothing else changes.** Sorting (Order, Status, Price), selection, the row click, the drawer, the filters and the CSV export are as before. The
  service name had no link and no second line in the old cell, so none is kept. `OrderTable` is the only user of the old `ServiceCell`, so
  `ServiceCell.tsx` is replaced by `ServiceCells.tsx` (`TypeCell`, `ServiceNameCell`, `InputCell`).

**Consequences.**
- The three cells serve the Orders page and every list that embeds `OrderTable` (an account's orders).
- No test named the old header; `OrdersPage.test` now checks the three headers, their order, and the three cells of a row, and
  `ServiceCells.test` covers each cell.

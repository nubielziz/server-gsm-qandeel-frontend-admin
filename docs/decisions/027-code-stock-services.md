# 027 Code-stock services and a service's own cost

**Context.** Every service could hold codes, and the backend delivered a code from stock to any order of a service that had some, unlocks
included. The owner sells gift-card codes they buy themselves (iTunes, Google Play): such a service has no supplier, so the All list said
"No supplier" in red and the shop refused it, and its cost was 0, so the shop price rules (cost plus a percent) could not price it while no
screen could set a service's own cost. The backend's decision 069 adds the two settings; this is the console's side (owner's order,
2026-11-25).

**Decision.**
- **Two settings per service** on +Add Service and in the editor: **Delivered from code stock** (Yes/No, default No; Overview part) and
  **Your cost** (USD; Pricing part, locked like Credit by `pricing:update`). The Pricing part's read-only cost row is **Cost used**: the
  larger of your cost and the supplier's, where the shop rules and the floor start. Copy settings copies both.
- **Codes only where they belong.** The editor's Inventory part shows only for a code-stock service (an address naming it for another
  service opens the first part); the Inventory view's menu and the import dialog list only code-stock services of the kind, read from the
  server (`GET /admin/services?stockDelivery=true&type=…`) with a note when the list is cut. The server refuses an import into another
  service (`not_stock_service`, shown under the codes) and refuses to turn the setting off while codes are in stock (`codes_in_stock`,
  shown under the switch).
- **Stock instead of "No supplier".** On the All list a code-stock service shows "Codes: N in stock"; when the server flags it
  `no_supplier` (no code and no usable supplier) it shows "No codes in stock" in red. An import or a void refreshes the lists and the record.
- **Shop words** for the new publish reason `out_of_stock`: "it has no codes in stock and no supplier" / "Import codes, then try again."

**Consequences.**
- The wire is the backend's decision 069: rows carry `stockDelivery`, `stockAvailable` and `ownCost`; create and change accept the first
  and the last. The console is released before the backend (CI reads the console's main); until the backend runs, rows lack the keys, so
  no Inventory part shows for a few minutes.
- When codes run out the order waits for staff as before (owner's choice for now); stopping sales instead would be a later change.

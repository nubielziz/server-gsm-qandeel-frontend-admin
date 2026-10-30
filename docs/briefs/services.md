Feature brief: **services**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/services`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/services.json` (24 endpoints).

# Feature: services ("Services & pricing", `/services`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/43-p-services.js` (read it all) and the pricing helpers it calls in `11-state.js` (`floorOf`, `marginOf`, `resolvePrice`/resolver trace, `belowFloor`, `setServiceField`, rules/promos). Entity rows in `src/lib/api/schema.gen.ts`: `ServiceRow`, `ServiceCategoryRow`, `ServiceFieldRow`, `ServiceOptionRow`, `ServiceGroupPriceRow`, `PricingRuleRow`, `InventoryCodeRow`, `ServiceSupplierLinkRow`. Drop `modeGate`.

## Page and permissions
- Page permission (manifest, any-of): `['catalog:read', 'pricing:read', 'inventory:read']`; each tab and action checks its own (catalog:* → read/create/update/delete per MISMATCHES M7, pricing:*, pricing:update, inventory:read / inventory:write).
- Header as the demo: the below-floor sentence uses a server count (list with `belowFloor=true`, total only). Actions: "Bulk price change…" (pricing:update), "New service" (catalog:create).
- Tabs (URL `tab`): **Services** (default), **Price resolver**, **Rules and groups**, plus new **Categories** (catalog:read) and **Code inventory** (inventory:read).

## Services tab
- Demo table and toolbar: search (name, code, category), type filter, chips "Below floor" and "Disabled", Clear filters, count. URL state like orders (`q`, `type`, `belowFloor`, `status`, `page`, `sort`); honour `/services?belowFloor=true` (ARCHITECTURE §5.2).
- Columns as the demo. **No pricing maths on the client**: floor, margin and "below floor" come from the server (assumed DTO fields `floorPrice`, `marginPct`, `belowFloor`, `costChangedFrom`, supplier and fallback names joined); log the assumption.
- Switches: Enabled (PATCH `status: 'active' | 'disabled'`) and Auto (PATCH `executionMode: 'auto' | 'manual'`; assumed field name), with the demo's toasts; optimistic UI not needed, show the server error.
- Row menu: Edit price… (dialog: price, minimum profit; PATCH; shows the floor and the margin the server returns after save), Group prices… (PUT `/admin/services/:id/group-prices`, one price per merchant group; group names via `GET /admin/client-groups` belong to the merchants feature: use a private read-only lookup without `@route` and note it in HANDOFF like orders did), Fields… (PUT `/fields`), Options… (PUT `/options`: model, network, MEP lists), Trace a merchant price (switch to the resolver with this service), See orders (`ordersListPath({ tab: 'all', q: service.name })` from `@/features/orders`), Delete (catalog:delete, confirm).
- "New service" / edit dialog: name, code, category, type, SLA minutes, supplier links are the suppliers feature's (`PUT /admin/services/:id/supplier-links` is in the suppliers slice, not yours: show the linked suppliers read-only and link to `/suppliers?supplier=<id>`).
- Bulk price change dialog: choose scope (category or selected services), change (percent or fixed), **Preview** (`POST /admin/services/bulk-price/preview`: table old → new, below-floor warnings from the server), then **Apply** (`/apply` with the same body). Assumed bodies, logged.

## Price resolver tab
Pick a service and a merchant (merchant lookup: private, read-only, like orders' lookups), call `GET /admin/pricing/resolve?serviceId&clientId` and show the price with the server's resolution trace (steps, floor, final price) in the demo's layout. Nothing is computed in the browser.

## Rules and groups tab
Pricing rules CRUD (`/admin/pricing-rules`: margin and discount rules, promos with dates) in the demo's layout (`cat-on`/`cat-off` = create/delete promo rules). Merchant group discounts are managed on the merchants page (`/merchants?tab=groups`): show them read-only with that link.

## Categories tab
Service categories CRUD (name, parent?, visible to which merchant groups), delete with confirm (the server refuses a category in use: show its message).

## Code inventory tab
`GET /admin/inventory-codes` (filters service, status; codes masked except the last 4 characters), Import codes… per service (`POST /admin/services/:id/inventory/import`: paste or upload a text file, one code per line; show the server's counts of imported, duplicates and rejected), Void selected unsold codes (`POST /admin/inventory-codes/void` with ids, danger confirm).

## Exports, palette, mocks, tests
- `index.ts`: `listServices`, the `Service` type, `servicePath(id)` style helpers if useful. Palette source: services by name/code (opens the Services tab filtered by `q`), registered in `manifest.ts`.
- Mocks inside the feature from the demo seed (`S.services`, categories, rules/promos, groups; synthesize inventory codes for one or two services). The mock computes floor/margin/belowFloor like the demo (it plays the server). Split files ≤ ~200 lines.
- Tests: api, lib, each tab, switches, edit price with a server error, bulk preview → apply, resolver trace render, rules CRUD, categories CRUD, inventory import/void, permissions. Helpers in `src/features/services/test/`.

## Bookkeeping
`manifest.ts` (page `services`, heading `Services & pricing`, permission any-of, registry, palette). `HANDOFF.md`: mismatch rows SERVICES-1… (at least: floor/margin from the server, new Categories and Code inventory tabs, assumed bodies, private lookups), SHARED-NEEDS, deep links, backend questions. Coverage 24/24.

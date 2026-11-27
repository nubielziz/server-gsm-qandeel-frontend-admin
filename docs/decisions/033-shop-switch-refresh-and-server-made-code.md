# 033 The shop switch refreshes its own record, the service code is made by the server, and the two merchant switches say what they do

**Context.** Three owner-visible problems of the Product / Services page were fixed together on 2026-11-27, and one backend decision
(074, released before this console) changed the create route. Console only, plus the contract change that the backend reads from here.

## 1. The shop switch shows its own result (bug)

In a service's edit view, part "Retail Purchase" (`/products?view=edit&type=imei&id=5&part=shop`), a press on "Shop switch" sent
`PATCH /admin/service-listings/5` and the server accepted it, but the part kept saying "On the shop" and "Yes" until a reload. A service with
no shop page, put on the shop by the same switch, kept saying "Not on the shop yet" in the same way.

**Cause.** `useServicesRefresh` marked the services stale with Refine's `invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] })`
and no id. Refine's `detail` key without an id is the key of the id `""` (`hooks/invalidate`), so the record the edit view holds open
(`useServiceDetail`, Refine `useOne` with the service's id) was never marked stale and was never read again. The All view was fine: its rows
use the shared rows key.

**Decision.**
- `useServicesRefresh()` returns `refresh(ids?)`. With ids it also makes `['detail']` of each `services` record stale (the targets of
  `staleServices(...ids)`, the name the mutations already use). `usePutOnShop` ends every move of the one switch with `refresh([service.id])`.
  `useServicesBulk` needs no change in its call: `useSequentialRun` already hands the ticked ids to its `refresh`, which ignored them; now it
  uses them.
- `OnShopSection` keeps `isListed ?? listing?.isListed`: once the record is read again the first value is right.
- The same mistake was looked for (a write made from inside an open service that invalidates `services` without an id). The ones left as they
  are, and why: `useGroupActions` (Group view: no service is open there), `useBulkPrice` and `usePricingRules` (Pricing view), `useSaveServiceOrder` (All
  view), the suppliers' import and Quick add (a supplier page; the record is read again when a service is opened, because Refine's `useOne` has
  no stale time), `usePublishRun` (the run page), `useUpdateListingContent` and the picture writes (they change only the shop page's own text,
  slug and picture, which the service record does not carry). The ones that can change the facts of an open record already name its id
  (`useServiceMutations`, `useServicePartMutations`, `useInventory`, `useSetGridStatus`, `useReplaceLinks`, `useSetRetailPrice`, `useFollowRule`,
  `useResolveRetailChanges`).

## 2. The service code is made by the server

Backend decision 074: `POST /admin/services` takes `code` as optional. Left out, the server makes `<PREFIX>-<id>` (imei `IMEI`, server `SRV`,
remote `RMT`, file `FILE`; `-2`, `-3` when taken). A code that is sent is kept, and a taken one is still refused (`CODE_TAKEN`).

**Decision.**
- "+Add Service" has no Code row. `createBody` never sends `code`; `CreateServiceBody.code` is optional; the copy from a chosen service is unchanged
  (it never copied the code). After the create the new service opens as before and its strip shows the code the server made. A saved draft of an
  older session that holds a `code` is read without it.
- The Overview shows Code as a plain value with the hint "Made by the system." It is not an input and is not part of `OverviewValues` or of the update
  body (`lib/serviceDetails.ts` no longer maps it). Staff cannot change a code in the console.
- The mock plays the server: a create without `code` makes the code after the row has its id; with one it keeps it and refuses a taken one.
- Removed as dead: the Code row and its messages ("Enter a code.", the hint "A short unique code…"), the form field and its server name, the
  Overview's `CODE_TAKEN` mapping, and the tests that typed a code.

## 3. The two merchant switches say what they do

- "User Can Cancel Order": "A merchant may cancel an order that was not sent yet. Website orders of this service wait 2 minutes before they are sent,
  so there is time to cancel." (Overview hint, and the Add form row, which had none.)
- "Send For Verification": "A merchant may ask once for a check of a completed order's result, inside the window below. The request shows in Orders,
  under Verification." (on both forms, so they say the same thing).
- The verification window follows one rule on both forms (`lib/verifyWindow.ts`): whole hours, 1 to 720, "Enter the hours, 1 to 720." With 0 the
  button never appears on the website, so 0 is refused. The Overview's hint no longer says "0 means no window". A stored 0 with verification on
  shows as it is and is refused on save with that message. The three sentences and the rule live in that one file, so the screens cannot drift.

**Consequences.**
- The wire keeps `verifyWindowH` 0 to 720 (the server still accepts 0); only the console asks for 1 or more while verification is on.
- `UpdateServiceBody` is still `Partial<CreateServiceBody>`, so its type still has an optional `code`; the console never sends it.

# Notifications: handoff

Page `/notifications` (campaign list) and `/notifications/:id` (one campaign), and the staff bell in the top bar. Slices E and F of feature 23 (plan `backend-23/docs/briefs/23-notification-center.md`, sections 16 and 17). 16 routes: 12 campaign routes and 4 staff inbox routes. No demo page: the design is the plan's section 16.

## Mismatches

| #       | Area                | Demo                                                    | Map / other source                                                                                                                                                       | Followed                   | Why                                                                                                                                                                                                                                                                                                      |
| ------- | ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NOTIF-1 | Routes              | No Notifications page, no bell.                         | The 16 routes are backend additions (`scripts/map-additions/23.mjs`, decision L1), not in the map. The coverage report lists their tags as "unknown".                    | Backend contracts          | Shapes are written from `campaign.contracts.ts` and `inbox.contracts.ts` of `backend-23`, not assumed. `schema.gen.ts` has no row type (the tables are not in the map), so `types/` is hand-written.                                                                                                     |
| NOTIF-2 | Permissions         | The role matrix has no broadcast area.                  | `broadcasts:read` and `broadcasts:send` (new). Only the Owner (`*`) has them until a role is granted the area (S7).                                                      | Plan 16.1                  | The mock permission catalog gets `broadcasts: 'read send'`; the mock role matrix is unchanged. The page opens with `broadcasts:read`; writes need `broadcasts:send`. The bell needs no permission: every staff member has an inbox (`staff-session`).                                                    |
| NOTIF-3 | Composer width      | -                                                       | Plan: "a wide Drawer".                                                                                                                                                   | Shared `Drawer`, as it is  | The shared Drawer is 580 px and has no wide variant; changing it is outside the shared files the plan names. The composer fits (single column).                                                                                                                                                         |
| NOTIF-4 | Names of people | - | A stored audience has only `{ type, id }` for `include` / `exclude`. | Console decision | Edit and Duplicate show picked people as "Account #12" until they are picked again; picking in the dialog keeps the real name and the rank. No extra lookup call per person (up to 500). |
| NOTIF-5 | Marketing and staff | - | Plan 5.1: for `marketing` only retail accounts and guests need consent; staff and accounts of a merchant rank are not filtered by it. | Plan | The purpose help says "Retail accounts and guests who did not agree to marketing are left out, on every channel." |

## One account type (the merge of merchants and customers)

A merchant, a shop buyer and a guest are accounts of one table, told apart by the rank they hold. What the console says and sends now:

- A person (`include`, `exclude`, the recipients table) is `staff` or `account`. The picker has two tabs, Staff and Accounts (`GET /admin/clients`, needs `clients:read`); a row shows the rank the account holds. A request that names `client` or `customer` is refused (422).
- The audience keys keep their names: `merchants` is the active accounts that hold a merchant rank (narrowed by merchant ranks, `groupIds`, and country) and `customers` is the retail accounts and guests (`hasAccount` keeps its meaning). On screen the second group is called Retail. The status choice is gone (`pending` no longer exists): the console never sends `statuses` and reads a stored one as active.
- The live count answers `byType` as `{ staff, merchant, retail }` (accounts counted by the kind of their rank). The link fields keep their keys (`staff`, `merchant`, `customer`); an account added by id shows both account links, because the audience keeps no rank for it.
- Marketing: retail accounts and guests need a granted consent; merchant ranks follow their own switches.

## Assumed contracts

None: every shape is the backend's contract (`campaign.contracts.ts`, `inbox.contracts.ts`, `notification-log.contracts.ts`). Things the console relies on:

- `GET /admin/notification-campaigns/:id/recipients` needs `channel` (a query parameter, not a filter); the console always sends it.
- `POST .../send` answers `409 CONFLICT` with the new number in the sentence (`detail`) and in an extension member `recipients`. `ApiError` does not carry extension members, so the console does not read `recipients`: it reads a fresh `audience-preview` instead and asks for a second confirmation with that number.
- `POST /admin/inbox/read-all` takes `{}` or `{ upToId }`; the console sends `{ upToId: <newest id on screen> }`.
- The log row's `campaignId` is optional in the console's type (`NotificationLogEntry`), the server always sends it (as in the backend contract).

## Backend questions

- None blocking.

> **2026-11-16, English only (decision 039):** the composer is one title and one text, the audience has no language filter, the preview and the test send have no language, and the inbox and the live stream carry no `locale`. The text above is the handoff as written.

## Notes for the lead

- Settings, notification tabs only: `types/notifications.ts` gains `campaignId`; the log tab reads `?campaignId=7`, sends it as a filter, shows a "Campaign" link column (to `/notifications/:id`, a literal path because the notifications feature imports settings, not the other way round) and a chip that clears the filter; `PreviewFrame` is exported from `features/settings/index.ts` for the campaign preview.
- The detail page's "Open in the log" button links to `/settings?tab=log&campaignId=<id>` (needs `notifications:read`, not shown for a draft).

## SHARED-NEEDS

Done in this branch (plan 16.1, lead decision L4): `src/app/featureManifest.ts` (`topbar`), `src/app/layout/ShellTopbarSlots.tsx` (new), `src/app/layout/Topbar.tsx`, `src/app/resources.ts` (page `notifications` with a detail route, after `checkouts`), `src/mocks/roles.ts` (`broadcasts` area), and the shell tests (`AppShell.test.tsx`, `resources.test.ts`, `palette.test.tsx`, `features.test.ts`).

Also changed, not named in the plan, each one line:

- `src/components/ui/index.ts` exports `FloatingPanel` (the plan's bell opens a `FloatingPanel`; it was internal to the kit).
- `src/features/customers/pages/CustomersPage.test.tsx`: formatting only (prettier), it failed `npm run lint` on the base commit.
- Bell sound and one-icon swing (owner, 2026-11-15, branch `feat/console-sound`): `src/app/layout/preferences.ts`, `PreferencesProvider.tsx` and
  `DisplayMenu.tsx` gain "Notification sound" (key `gsm-notification-sound`, on by default; the chime reads it through `readNotificationSound`), and
  `src/styles/index.css` drops the unused `.bell-ring` class (the swing is played with the Web Animations API, `lib/bellRing.ts`).

For the lead after the backend branch merges:

- Run `npm run mocks:live` (`BACKEND_DIR` = the merged backend) so `VITE_API_MOCKS=unbuilt` lets the 16 routes through to the real API.
- Move the NOTIF rows above to `docs/MISMATCHES.md` (`node scripts/integrate-handoff.mjs notifications`).

## Deep links

| Address                                     | Opens                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/notifications?status=…&purpose=…&q=…&page=…` | the campaign list with those filters (`notificationsListPath` in `@/features/notifications`) |
| `/notifications/<id>` (`campaignPath`)      | one campaign                                                                                |
| `/settings?tab=log&campaignId=<id>` (`campaignLogPath`) | the notification log narrowed to one campaign's messages                         |

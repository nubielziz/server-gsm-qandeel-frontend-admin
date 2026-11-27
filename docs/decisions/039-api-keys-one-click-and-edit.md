# 039 API keys: one click to make one, and a key that can be edited whole

**Context.** On 2026-11-27 the owner asked for a key to be made with one click and ruled what "the permissions of a key" are: **which IP addresses may use the
key, and for what period it is valid**. Both already existed (`allowedIps`, `expiresAt`) but the first sat in a dialog, the second was folded away in the new key
form (decision 035) and could not be changed afterwards. The backend (decision 078) makes `name` optional on a new key (the server names it `API key <n>`) and lets
`PATCH /admin/api-keys/:id` change `name` and `expiresAt` beside `rateLimitPerMin` and `allowedIps`.

**Decision.**
- **"Generate API key"** is the main button of the API part. One click makes a key for the account (no dialog, no name sent: the body is `{}` plus the scope a Dhru
  key carries) and opens the existing one-time dialog with the key. It is locked as "New key…" was (`api_keys:create`, the Owner, an active account), loads while the
  call runs, and a refusal is a toast with the server's words (there is no dialog to show it in). A quieter "Key with limits…" opens the form for someone who wants to set
  things first. Once the one-time dialog holds the key the part calls `generate.reset()`, so the mutation's state keeps no copy of the full key while the part stays open.
- **The two dialogs say "Permissions".** The new key form and "Edit key" share `PermissionsFields`: one section "Permissions" with "Allowed IP addresses" (one per line;
  empty means any address) and "Valid until" (a date; empty means no end), both always in view. "Valid until" is out of the fold again (decision 035 put "Expires on"
  there) and renamed; "Limit a minute" stays under "More options" (and opens it while it holds a message). The new key form's Name is optional ("Empty: the system
  names it."); a name that is typed is trimmed and sent.
- **Edit key** (was "Limits of …", `KeyLimitsDialog` is now `EditKeyDialog`): Name, Permissions, and Limit a minute under "More options". It sends only what changed
  (`editBody`): the name trimmed, the addresses compared as lists (an emptied box is `[]`), the day compared as a day (so a key's own end, which is the end of its day,
  sends nothing) and a cleared day is `expiresAt: null`. Nothing changed is a toast and no call. A day that has passed is refused before sending only when it was typed;
  an expired key can be renamed with its old day left as it was. The server's refusals show under their fields (`expiresAt` under "Valid until", `allowedIps.N` under the
  list with the line) or in the dialog: 403 (a change that gives the key more reach is for the Owner) in the server's own words, 409 `ALREADY_REVOKED`.
- **The list shows the permissions at a glance.** One "Permissions" column replaces "Allowed addresses": the addresses (mono) or "Any address", and under them
  "Valid until 31 Dec 2026" or "No end"; a key whose end has passed adds " · Expired" in the warning colour (its state also says Expired). "Edit…" (aria label "Edit <name>")
  is on every key that is not revoked, so an expired key can be given a later end (the server asks for an Owner and for room among the ten live keys); "Revoke…" is on the same keys (an expired key can be brought back by an Owner's later end, so it may be revoked to stay dead; its dialog says the key has passed its end).
  Below the `sm` width the Permissions column is hidden, so the same words (addresses, "Valid until …", " · Expired") are one line under the key's name there.
**Consequences.**
- Types: `CreateApiKeyBody.name` is optional; `UpdateApiKeyBody` gains `name` and `expiresAt: IsoDateTime | null`. `@route` tags are unchanged.
- The mock plays the server: a key made with no name is `API key <n>` (the smallest number no key of the account holds), an edit takes `name` and `expiresAt` (`null` for none),
  and an edit that gives more reach is a 403 for a session that is not the Owner, with the backend's words.
- The success toast of an edit reads "API key saved" (was "Limits saved"); the one of a new key names the key from the answer, since the name may be the server's.

# Settings: handoff (feature 24C, payment provider fixes, console slice)

No new route. The payment method dialog and card gain the webhook secrets; the contract is the backend's `gateways.contracts.ts` (24C).

## Contract fields (all on `/admin/payment-gateways*`)

- Response (list, show, create, update): `webhookSecretHint` and `secondaryWebhookSecretHint`, each `string | null` (`••••` and the last 4
  characters; `null` = none stored). The console treats a missing field as `null`.
- Request (`POST`, `PATCH`): `webhookSecret?: string` (write-only; replaces the first secret, keeps the second); `secondaryWebhookSecret?: string | null`
  (write-only; a string sets the second, `null` removes it; `422` on `secondaryWebhookSecret` when the gateway has no first secret and none is sent).

## Console behaviour

- Fields are shown only while "A person checks each payment (manual)" is off. A manual method never sends webhook secrets.
- Only typed secrets are sent. The second secret goes as `null` only when the person used Remove on a stored one. Typed text is trimmed.
- The webhook address shown is the path `/webhooks/payments/<code>`, without the API's origin (the console does not know the public API address).

## Mismatches

None. Files outside `src/features/settings/`: none.

---

# Settings: handoff (feature 32, ready-made payment methods with logos, console slice C)

Backend additions (B232, MISMATCHES M266). The backend is built on `feat/backend-32` (`/home/saifi/gsm-project/backend-32`, contracts in
`src/modules/money/contracts/gateways.contracts.ts`); the console was written from plan section 5 and its mocks, and the mock catalog is the backend's
`GATEWAY_PRESETS` word for word (a test compares it).

## Routes

- `GET /admin/payment-gateway-presets`: the catalog, a plain array: `{ key, name, kind, available, driver, methodType, instructions }`.
- `POST /admin/payment-gateways/:id/logo` (multipart, one part `file`, answers the gateway) and `DELETE /admin/payment-gateways/:id/logo` (204).
- `POST /admin/payment-gateways` takes an optional `preset`; every gateway row has `preset: string | null` and `logoUrl: string | null`.
- Code: `api/gateways.ts` (`listGatewayPresets`, `uploadGatewayLogo(id, body: FormData)`, `removeGatewayLogo`), hooks in `hooks/useGateways.ts`
  (`useGatewayPresets`, `useUploadGatewayLogo`, `useRemoveGatewayLogo`), mocks in `mocks/gatewayPresetRoutes.ts` and `mocks/gatewayPresets.ts`.

## Console behaviour

- The Payment methods tab starts with the gallery "Ready-made methods" (`PresetGallery`), then "Your payment methods". The header button is
  "Add custom method". An entry with `available: false` shows Coming soon and has no Add. A card counts the saved methods whose `preset` is its key.
- Add on an entry opens `GatewayDialog` with `start`: name, a free code made from the key (`freeCode`), the driver, manual, the instructions template.
  The method starts switched off. The body carries `preset`; an edit never sends it. A refusal on `preset` shows in the dialog's error slot.
- **A method made from a preset keeps its driver and its kind** (backend rule: `PATCH` answers 422 on `driver` (`preset_driver`) or `isManual` (`preset_kind`)
  when the merged row is not the entry's; create refuses the same). `GatewayFields` gets `presetMade` (an edit of a row whose `preset` is not null, or the add
  dialog opened from the gallery): the Driver is `readOnly` (still submitted), the manual box is `aria-disabled="true"` with its click stopped (not
  `disabled`: react-hook-form drops the value of a disabled field), and each says "Set by the ready-made method; it cannot change." A custom method keeps both free.
  The server's message still shows under the field if it comes.
- `PaymentMethodLogo` (the one component for a logo) draws the uploaded `logoUrl`, else the bundled file of the preset, else an icon by type
  (`methodTypeOf` reads the driver the way the backend reads the top-up word: bank or Wise = bank, `usdt` = coin, card = card). A picture that fails to load
  falls to the next one. Used in the gallery, on each saved method's card and in the dialog's Logo field; there the name is printed beside the logo, so the
  picture takes `alt=""` (`nameShown`); without that prop its alternative text is "<name> logo".
- Bundled files: `src/assets/payment-logos/<key>.png` read with `import.meta.glob` (eager), so a file added later needs no code change; the
  automatic Binance Pay uses `binance_pay`. A missing file shows the icon. Where each file comes from: `docs/LOGOS.md`.
- `GatewayLogoField` (edit dialog only): Upload or Replace, Remove, saved at once, client check of type and 2 MiB, the server's refusal under it.

## Files outside `src/features/settings/`

- `src/components/ui/iconPaths.ts`: three icons, `bank`, `coin` and `card` (the shared icon set had none; the support feature added `paperclip` the same way).
- `docs/MISMATCHES.md` (M266), `docs/ASSUMED_CONTRACTS.md`, `docs/LOGOS.md`, `src/assets/payment-logos/` (the lead adds the files).

## Mismatches

M266 (above). The plan says "table"; the console shows methods as cards, so the logo is on each card beside its name.


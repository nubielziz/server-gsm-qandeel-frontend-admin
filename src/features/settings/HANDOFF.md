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

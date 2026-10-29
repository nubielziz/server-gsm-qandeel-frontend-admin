# Mismatches

Where the demo (`reference/gsm-admin`) and the map (`reference/gsm-map`) disagree, or a source contradicts itself.
Precedence: API shape, entities, permissions and error codes follow the **map**; screens, layout, copy and interactions follow the **demo**.
Every row says what differs, which source we followed and why. Nothing is picked silently.

| # | Area | Demo | Map / other source | Followed | Why |
|---|---|---|---|---|---|
| M1 | Abandoned-cart reminders | Sends a reminder to every abandoned checkout that has an email. | `POST /admin/checkouts/recover` sends one recovery email, only to customers with marketing consent (`consent_records`). | Map | Consent is a legal rule the server enforces. The UI only offers the action for consented rows and shows the server's answer. |
| M2 | Design source | `design-system/gsm-supply-admin/MASTER.md` describes a dark theme, Fira fonts and a green accent. | `DESIGN.md`, `tailwind.config.cjs` and `input.css` (what the demo actually renders): warm light paper, IBM Plex, ink-black primary, one working blue. | `DESIGN.md` + demo CSS | The brief says keep the demo's look; MASTER.md is a generated draft the demo never used. |
| M3 | Merchant withdrawals | Finance page has a Withdrawals tab (pay / reject a withdrawal request). | Table `withdrawal_requests` exists, but no admin route reads or decides it. | Map | No endpoint to call. The tab is left out; the backend can add withdrawal routes later and the tab can be ported then. |
| M4 | Storefront checkout preview | Storefront page has a Preview tab that walks a fake customer through check, consent and pay. | That flow is the `store` surface (out of scope for the console). | Map + scope | Not ported as a simulation; replaced by a link to the live storefront (`VITE_STOREFRONT_URL`). |
| M5 | Sign-in screens | The demo has no sign-in, 2FA or set-password screens (it starts signed in). | Map defines login → TOTP, first-time TOTP setup, and invite/reset links. | Map | New screens built in the demo's visual language. Request/response bodies are assumptions (decision 006) until the backend confirms them. |
| M6 | Auth request/response bodies | – | The map names the auth routes but not their bodies (`login` next step, `2fa/setup` QR format, `me` fields, CSRF token source). | Assumption | Documented in decision 006; each assumption lives in one function so a different answer is a one-file change. |
| M7 | Permission per CRUD operation | Demo role matrix grants areas, not actions. | CRUD rows carry `x:*`; action rows carry `x:action`. | Map + assumption | `x:*` on a CRUD row is read as `x:read` (list/show), `x:create`, `x:update`, `x:delete`; a granted `x:*` matches all. Server enforcement decides in the end. |
| M8 | Queues monitor | – | `GET /admin/queues` is the Bull Board UI, not JSON. | Map | Exposed as a link that opens in a new tab; the typed function builds the URL instead of fetching. |
| M9 | "Synthetic data" note and mode switcher | Sidebar footer says the data is synthetic; topbar has a mode switcher (normal/loading/empty/error). | – | Brief | Not ported. The footer shows API health (`GET /health`); loading/empty/error come from real query states. |

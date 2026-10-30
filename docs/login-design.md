# Sign-in screens: design brief

## The one idea
A sign-in page that reads like the first sheet of the ledger it opens: a quiet form on paper, and beside it a ruled
sheet that carries only true facts about this console (environment, API, build, local time). Nothing decorative that
is not also information.

## Who signs in
Internal staff (owners, operators, finance, support) entering an operations console that moves money. They sign in
daily, often in a hurry, sometimes from a new network. They need speed, certainty about which environment they are in,
and a calm, specific answer when they are blocked (suspended account, address not allowed).

## Layout (direction A, "ledger split")
```
desktop ≥1024px                                   phone 360–430px
+------------------------------+-----------------+   +----------------------+
| GSM Supply / admin           |  ruled sheet    |   | GSM Supply / admin   |
|                              |  (hairline rows |   |                      |
|   Sign in            (22/28) |   every 32px)   |   | Sign in              |
|   Staff accounts only…       |                 |   | Staff accounts only… |
|                              |                 |   | [Email          ]    |
|   [Email               ]     |                 |   | [Password     ⦿]     |
|   [Password          ⦿]     |                 |   | [   Sign in      ]   |
|   [      Sign in       ]     |                 |   | Forgot…              |
|   Forgot your password? …    |-----------------|   |----------------------|
|                              | env   mock data |   | env · api · build    |
|                              | api   origin    |   | (status, mono 11px)  |
+------------------------------+-----------------+   +----------------------+
```
- Left column: wordmark top-left; form column 380px wide, left-aligned, vertically centred, 80px side padding on
  desktop (48 tablet, 24 phone). Right: sunken sheet (`bg-sunken`) with hairline rules every 32px (the 4/8 grid,
  4×8), a hairline start border, and the status block at its foot. On phones the sheet is hidden and the status
  block becomes a single mono line under the form.
- Status facts (all real): environment (`development` / `production` from `import.meta.env.MODE`, plus "mock data" when
  `VITE_API_MOCKS` is on), API (host of `VITE_API_BASE_URL`, or "same origin"), build (`package.json` version),
  local time with UTC offset (updates each minute).

## Type and spacing (existing tokens only)
- IBM Plex Sans 400/500/600, IBM Plex Mono 400 for the wordmark suffix, status and identifiers. No new font.
- Title 22/28 600 −0.01em (the console's Title); intro Body 13/18 `text-ink2`; labels 12/16 500 `text-ink2`; status
  11px mono `text-ink3` labels, `text-ink2` values.
- Spacing on the 4/8 grid: 8 between label and field, 16 between fields, 32 between intro and form, 24 around the
  status block. Inputs and the primary button 36px high (one step above the console's 32px, for a first screen).
- Colour per DESIGN.md: ink-black primary button (the one heavy element), working blue only for focus rings and
  links, crit/warn/good tones only for status notices. Hairline borders, no shadows. Light and dark follow the
  console's `data-theme` / system preference (tokens already switch).
- Motion: none beyond the kit's 150ms colour transitions; respects `prefers-reduced-motion`.

## States (from the auth routes and problem+json codes)
Routes: `POST /admin/auth/login`, `/2fa`, `/2fa/setup`, `/password/set`, `/logout`, `GET /admin/auth/me`. No
forgot-password, remember-me or social routes exist, so none are shown.
1. Sign in (email, password with show/hide); field errors from `VALIDATION_FAILED`; a non-revealing banner for a
   wrong pair ("Email or password is incorrect"); `RATE_LIMITED` with the wait time.
2. Arrived from a protected address (`?to=`): a one-line note naming where sign-in will continue.
3. Password just set (`?reason=password-set`): a good-tone note.
4. Account suspended (`?reason=suspended` or `ACCOUNT_SUSPENDED` 403): its own status screen, who to contact,
   "Use another account".
5. Address not allowed (`?reason=ip` or `IP_NOT_ALLOWED` 403): its own status screen with the next step.
6. Two-step code (6 digits, paste-friendly, `one-time-code`).
7. Two-step setup (QR / secret, then the code).
8. Choose a password (invite link, reset link, forced change): `new-password`, `WEAK_PASSWORD` under the field,
   `TOKEN_INVALID` (410) as a dead-link status.
9. Generic failure (network, 5xx): human message with the request id when the server gave one.

## Will NOT do
Gradients, orbs, glow, glass cards, giant shadows, icon-in-a-circle heroes, illustrations, emoji, "Welcome back",
social login, "trusted by" strips, marketing copy, placeholder-only labels, centred paragraphs, animations over 200ms,
fake stats.

## Direction choice
Explored: A "ledger split" (form left, ruled status sheet right) and B "single sheet" (one column with a margin rule,
status along the bottom edge). Chose A: the ruled sheet is the one restrained, memorable detail and it ties to the
console's ledger identity; the status block reads as real information rather than chrome; B left the right half of a
wide screen empty and its 16px title lost the page's hierarchy.

## Skills used
- Frontend Design (Anthropic): direction, composition and detail inside the console tokens.
- UI/UX Pro Max, Impeccable, Web Design Guidelines (Vercel): not installed in this environment. Their roles were
  covered by `design:design-critique` (critique) and `design:accessibility-review` (accessibility), which are installed.
- Dashboard Design: not used (no tables or charts here).

## Result and critique (round 1 of 2)
- Built: `AuthLayout` (ledger split), `AuthStatusLine` + `useAuthEnvironment` (env, API, build, time), `PasswordField`
  (show/hide), `AuthStatusScreen` + `SignInBlocked` (suspended, address not allowed), `SignInNotes` (`?to=` and
  password-set), `SignInForm`, `SetupFailure`. Auth logic, the auth provider, API functions and routes are unchanged.
- Checked by screenshots at 1440×900 and 390×844: sign in, empty submit, wrong password (server message with request
  id), `?to=`, password set, suspended, address not allowed, two-step code, choose password, dead link; plus dark mode
  and the keyboard order (Email, Password, Show, Sign in).
- Critique (Opus, `design:design-critique`): no blocking findings. Nothing from the slop list is present; one heavy
  element per screen (the ink button); colour only for focus, links and status; hairlines, no shadows; labels visible;
  copy specific and calm. A second round was not needed.

## Leftovers
- The wrong-pair message is the server's own neutral text ("The email or password is not correct."); the console does
  not rewrite it.
- The phone status line leaves out the time (it would wrap at 360px).
- Status screens use fixed copy rather than the server's `detail` (calmer, and the codes are fixed).
- Not run: an automated contrast audit (no tool in this environment); contrast was checked against the DESIGN.md token
  ratios instead.

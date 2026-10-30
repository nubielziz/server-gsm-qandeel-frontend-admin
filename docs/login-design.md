# Sign-in screens: design brief (wave background)

This replaces the earlier "ledger split" direction (commit `0947ef8`), which the product owner asked to rebuild.

## The reference, in five lines (composition only)
1. A light page with a small wordmark in its top-left corner.
2. One opaque white card, centred, about 400px wide, soft radius and a soft shadow.
3. Inside: a bold heading, a labelled email field, a password field whose label row carries a right-aligned "forgot"
   link, and a full-width solid primary button.
4. Behind and beside the card, a colourful silky wave sweeps in from the top and down the right side, cropped by the
   viewport, leaving calm light space on the left.
5. The card overlaps the edge of the wave, so the artwork frames the form without touching its text.

The image itself did not arrive with the request; this description comes from its written brief. Nothing of the
reference's artwork, colours, logo or wording is used: the ribbons, palette and copy below are our own.

## Palette (the wave only; gradients exist nowhere else)
Light theme, from the console tokens in `src/styles/index.css` (DESIGN.md "Working Blue" and the chart series):

| Token | Hex | Source | Role in the silk |
|---|---|---|---|
| `--wave-1` | `#1c5cab` | `--accent-ink` | deep start of the main ribbon |
| `--wave-2` | `#2a78d6` | `--accent` / `--s1` | the blue body |
| `--wave-3` | `#1baf7a` | `--s3` (chart green) | the turn towards warmth |
| `--wave-4` | `#eda100` | `--s4` (chart amber) | the warm middle and the back of the cloth |
| `--wave-5` | `#eb6834` | `--s2` (chart orange) | the warm tail and the accent ribbon |

Dark theme: the dark chart tokens deepened by about 15% (`#123a70`, `#2868be`, `#15805c`, `#b07600`, `#ba4a1e`), with
less ambient light (0.38 instead of 0.62) and a softer sheen (0.32 instead of 0.55). Blue to green to amber to orange
is the console's own data palette, so the artwork reads as ours and avoids the indigo-violet-pink "AI gradient".

## Wave composition
```
desktop (≥ 768px)                                         phone (< 768px)
+--------------------------------------------------------+  +---------------------------+
| [GS] GSM Supply admin        \\\\\\\ silk enters \\\\  |  | [GS] GSM Supply admin  \\\ |
|                         ~~~~\\\\\\\\\\\\\\\\\\\\\\\\\\\  |  |   band ≈ 32vh   \\\\\\\\\\\ |
|               +-----------+\\\\ fold \\\\\\\\\\\\\\\\\  |  | +-----------------------+ |
|               |   card    |  \\\\\\\\\\\\\\\\\\\\\\\\\\  |  | |  card, 20px margins,  | |
|               |  400px    |     \\\\\\\\\\\\\\\\\\\\\\\ →|  | |  top-aligned          | |
|               +-----------+          \\\\\\\\\\\\\\\\\\  |  | +-----------------------+ |
| GSM Supply · v0.1.0 · [dev]               \\\\\\\\\\\\  |  | GSM Supply · v0.1.0       |
+--------------------------------------------------------+  +---------------------------+
```
- Three sheets in a seeded composition: a wide pale sheet behind, the main ribbon (blue → green → amber) that twists
  once and passes under the card's right edge, and a narrow amber-orange ribbon that crosses it and leaves at the
  bottom-right corner. The left ~35% of the page stays plain paper.
- Each sheet is 48–72 thin strands along a twisted centre line (cubic Bézier plus a slow sideways wobble). The twist
  folds the cloth where it turns edge-on; each strand is shaded like fabric (light from the top left, a soft sheen and
  a narrow glint where the cloth faces the light, a different colour on its back after a fold). Thin fibre lines on top
  give the silk grain; a faint rim keeps the edges crisp on paper.
- Drawn on a `<canvas>` after first paint, in a lazily loaded chunk (`WaveCanvas`, 6.45 kB, 3.1 kB gzipped), one sheet
  per frame; the form never waits for it. If the chunk cannot load, or the browser has no 2D canvas, the page simply
  has no artwork. No WebGL, no library, so no decision record is needed. It is static; it fades in once (200ms, none
  with reduced motion).
- Phones: the same sheets are framed into a band across the top, `clamp(240px, 68vw, 330px)` tall (about a third of a
  common phone screen). Its height follows the width only, so the on-screen keyboard never redraws it; its lower edge
  fades out, and the frame is shifted right so the wordmark stays on plain paper.

## Card and form
- Page: `--bg` paper. Card: `--surface`, max 400px, padding 36px (24px across and 28px down on phones, so a 360px
  screen keeps 270px of field width), radius 12px (softer than the 8px panels because it floats over curved artwork),
  a hairline border and a two-layer shadow (tight 1px plus a wide faint one, black in both themes).
- Position: centred across. On wide screens its top edge sits at `max(6rem, 50dvh - 13rem)`, where the sign-in card's
  top would be if centred, a little above the middle: an error box then grows the card downwards instead of pushing
  the heading up, and every step's heading stays in the same place. On phones it is top-aligned with 20px margins and
  overlaps the bottom 64px of the band.
- Type: IBM Plex Sans only. Heading 22/28 600 (24/30 from 768px). Helper text 14px `--ink2`. Labels 13px 500 `--ink`.
  Inputs 44px high, radius 8px, text 16px on phones (no iOS zoom) and 15px from 768px; the code field is mono 18px.
- Input border: `--ink3` at 80%, because the border is the only thing that shows where a field is (WCAG 1.4.11 needs
  3:1; the console's `--line2` gives 1.5:1).
- Primary button: full width, 44px, solid accent. `--accent-ink` with `--surface` text in both themes (#1c5cab in
  light, #6da7ec with dark text in dark), because plain `--accent` with white text is only 4.4:1. Hover and active mix
  in the ink colour (`color-mix`), which darkens it on paper and lightens it on the dark theme, so the label's contrast
  only grows. `:focus-visible` adds the console's 2px accent outline. While a request runs the label turns invisible
  (it keeps the width and the accessible name), a spinner sits on top, and `aria-disabled` plus a guard ignore further
  clicks and Enter presses without dropping the focus; after success the spinner stays until the next screen opens.
- This deliberately departs from DESIGN.md's ink-black primary on this one surface, as the brief asks for an accent
  button; the rest of the console keeps ink-black.
- Inputs focus with a 2px accent ring and a soft outer halo (crit ring and halo on a field with an error). Errors add
  a crit border, the message under the field with an icon (`aria-invalid`, `aria-errormessage`, and the same id in
  `aria-describedby` for screen readers that ignore `aria-errormessage`) and a line in the form's live summary.
- Validation runs on submit and when a field is left, never per keystroke. One exception: a change that fixes a field
  clears its error at once. Otherwise pressing the submit button would blur the field, its message would vanish, the
  button would move up under the pointer and the click would be lost (found by the contrast script in round 4).
- Live summary (`FormAlert`, `role="alert"`, keyed by the submit count so a repeat is read out again): a server
  failure is a visible crit box with its next step and request id; field errors are named for screen readers only
  ("2 fields need attention: Email, Password."), because each is already printed under its field.
- Copy: a wrong pair always reads "Email or password is incorrect" with "Check both and try again, or ask an Owner to
  send you a reset link.", whatever the server's words, so the screen never hints which of the two was wrong. This is
  the one place the screens do not show the server's title (ARCHITECTURE §4); the request id is still shown. A rate
  limit reads "Too many sign-in attempts" with the wait from `Retry-After`. Other failures keep the server's words; the
  dead-link card adds "Ask an Owner to send you a new link." only when the server gave no detail.
- Wordmark: the console's GS mark (24px) with "GSM Supply" and a mono "admin". Footer: "GSM Supply admin console ·
  v0.1.0", plus an environment badge in development builds only.

## Theme decision
The console already switches themes (`data-theme` plus the system setting), so the sign-in screens follow it. The light
theme is the reference look; the dark theme keeps the same composition with a dark canvas, the dark surface card and the
deeper wave palette above.

## States (from `docs/slices/foundation.json` and the problem+json codes)
Routes: `POST /admin/auth/login`, `/2fa`, `/2fa/setup`, `/password/set`, `/logout`, `GET /admin/auth/me`. There is no
self-service reset, remember-device, passkey, social sign-in, code resend or backup code route, so none is shown.
1. Sign in: empty, filled, field errors (required, email format), wrong pair (generic, with a next step; the password is
   cleared and the email kept), `RATE_LIMITED` (reason and wait time), network or server failure (with request id),
   loading.
2. "Forgot your password?": an inline note, "Ask an Owner to send you a reset link."
3. Arrived from a protected address (`?to=`, which also covers an expired session): a note naming where sign-in leads.
4. Password just set (`?reason=password-set`).
5. Two-step code (`/login/2fa`): the 6-digit code from the authenticator app, one way back.
6. Two-step setup (`/login/setup-2fa`): QR code and key, then the code; a setup failure offers Retry.
7. Choose a password (`/set-password`): invite or reset link (with a token), forced change after a temporary password
   (without one); `WEAK_PASSWORD` under the field.
8. Dead link (`TOKEN_INVALID`, 410), account suspended (`ACCOUNT_SUSPENDED` or `?reason=suspended`), address not
   allowed (`IP_NOT_ALLOWED` or `?reason=ip`): calm status cards with one next step.

## Results
Four visual rounds in all: three for the wave alone, one for every screen (13 states, light and dark, 1440×900 and
390×844, plus 360×640). Round 4 fixed: "admin" in the wordmark sitting on a ribbon on phones (frame shifted right), the
card jumping up when an error box appeared (top edge anchored), a blue-and-red ring on a focused invalid field (crit
ring), the input border at 1.5:1 (now 3.5:1), and the lost click described above.

Contrast, measured in the browser (text over the artwork against the worst canvas pixel under it):

| Element | Light | Dark |
|---|---|---|
| Heading / label / input text | 19.2 | 15.2 |
| Helper, hint, Show, status body (`--ink2`) | 8.8 | 9.7 |
| Primary label (rest / hover) | 6.5 / 7.7 | 7.0 / 7.8 |
| "Forgot your password?", way back (`--accent-ink`) | 6.5 | 7.0 |
| Field error (`--crit-fg`) / alert box | 6.4 / 5.5 | 6.4 / 5.7 |
| Wordmark "admin", footer (`--ink3` on paper) | 5.1 | 6.8 |
| Input border / invalid border / focus ring (3:1 needed) | 3.5 / 4.7 / 4.3 | 4.4 / 3.6 / 4.8 |

Tap targets on phones are 44px: inputs, buttons, the Show button, the copy-key button, the way-back link, and the
"Forgot your password?" toggle (its hit area reaches 44px without moving the label row).

## Leftovers
- On wide screens the back sheet at the top-right corner reads partly as a soft patch where the viewport crops it; the
  wave's three rounds were used up.
- The two-step setup card (QR code, key and code) scrolls a little on a 900px-tall screen, since the card's top edge is
  anchored.
- The spinner keeps turning with reduced motion: with `aria-busy` it is the only loading cue.
- "Forgot your password?" sits on the password label's row, as asked, so it is a tab stop between the two fields.
- The mock API never rate-limits, so the rate-limit message is covered by tests, not by screenshots.

## Skills
- Frontend Design (Anthropic): used at the concept step.
- UI/UX Pro Max, Impeccable, Web Design Guidelines (Vercel): not installed here. The critique and the audit were done by
  hand: screenshots of every state, a contrast script, and keyboard and screen-reader checks in the tests.

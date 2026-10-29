---
name: GSM Supply Admin Console
description: A calm, dense operator console for a B2B GSM supplier. Queue first, ledger underneath.
colors:
  paper: "#f7f7f4"
  sidebar-paper: "#f3f3ef"
  surface: "#fcfcfb"
  sunken: "#f2f2ee"
  hover: "#f4f4f0"
  hairline: "#e3e2dc"
  hairline-strong: "#cfcec5"
  ink: "#0b0b0b"
  ink-secondary: "#4a4945"
  ink-muted: "#6b6a64"
  accent: "#2a78d6"
  accent-ink: "#1c5cab"
  accent-soft: "#e6effb"
  good-fg: "#0a5c0a"
  good-bg: "#e5f3e5"
  good-dot: "#0ca30c"
  warn-fg: "#7a4f00"
  warn-bg: "#fcf0d4"
  warn-dot: "#fab219"
  serious-fg: "#9a3a0e"
  serious-bg: "#fce9e0"
  serious-dot: "#ec835a"
  crit-fg: "#b42323"
  crit-bg: "#fbe6e6"
  crit-dot: "#d03b3b"
  series-imei: "#2a78d6"
  series-server: "#eb6834"
  series-remote: "#1baf7a"
  series-file: "#eda100"
  night-paper: "#0d0d0d"
  night-surface: "#1a1a19"
  night-ink: "#f0efec"
  night-accent: "#3987e5"
typography:
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-default-hover:
    backgroundColor: "{colors.hover}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.crit-fg}"
    rounded: "{rounded.md}"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 10px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  badge-good:
    backgroundColor: "{colors.good-bg}"
    textColor: "{colors.good-fg}"
    rounded: "{rounded.sm}"
    height: "20px"
  badge-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-fg}"
    rounded: "{rounded.sm}"
    height: "20px"
  badge-crit:
    backgroundColor: "{colors.crit-bg}"
    textColor: "{colors.crit-fg}"
    rounded: "{rounded.sm}"
    height: "20px"
  table-header:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-muted}"
    height: "32px"
  nav-link-current:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "32px"
---

# Design System: GSM Supply Admin Console

## Overview

**Creative North Star: "The Dispatch Desk"**

An operator sits at a desk with the queue on top and the ledger underneath. The first screen answers one question, what needs me now, and every row that needs a decision carries its own action. Nothing is decorative: no hero metrics, no gradients, no illustration. Density comes from small fixed type, hairline rules and tabular numerals, not from shrinking things until they strain.

The surface is warm paper rather than cool grey, the primary action is ink-black rather than brand-coloured, and colour is held back for meaning: one blue for links, focus and selection, and four status hues that only ever appear with an icon and a word. The result reads like a well-kept ledger book that happens to be interactive. Light is the default because the work happens in bright offices; dark is a separate set of steps, not an inversion.

**Key Characteristics:**
- Queue first: every list screen opens on what is waiting, most urgent first.
- Every amount traces to journal entries; the UI says so wherever money appears.
- Fixed type scale (11/12/13/14/16/18/22 px), IBM Plex Sans with IBM Plex Mono for identifiers.
- Flat at rest: hairlines separate, shadow only lifts popovers.
- Status is never colour alone: icon + word + hue.
- Safe by default: money-moving actions open a review dialog with the consequence stated before the confirm button.

## Colors

A warm off-white field, near-black ink, one working blue, and four reserved status hues.

### Primary
- **Ink Black** (#0b0b0b): primary buttons, the selected tab underline, the single heaviest element on a screen. Its rarity is the hierarchy.

### Secondary
- **Working Blue** (#2a78d6; text variant #1c5cab): links, focus rings, selected switches, the first chart series. Never used as a fill for large areas.

### Neutral
- **Paper** (#f7f7f4): page background. **Surface** (#fcfcfb): panels, dialogs, inputs. **Sunken** (#f2f2ee): table headers, segmented controls, skeletons. **Hover** (#f4f4f0).
- **Hairline** (#e3e2dc) and **Hairline Strong** (#cfcec5): every divider and control border.
- **Ink Secondary** (#4a4945, 8.9:1 on surface) and **Ink Muted** (#6b6a64, 5.0:1): secondary and tertiary text. Nothing lighter carries information.

### Status (reserved)
- Good #0a5c0a on #e5f3e5, Warning #7a4f00 on #fcf0d4, Serious #9a3a0e on #fce9e0, Critical #b42323 on #fbe6e6. Dots (#0ca30c, #fab219, #ec835a, #d03b3b) are for meters and timeline nodes. Critical severity in Needs attention is the one solid fill (#d03b3b with white text, 4.8:1) so it cannot be mistaken for High.

### Data series
- IMEI #2a78d6, Server #eb6834, Remote #1baf7a, File #eda100. Fixed order, never cycled, never reused for status.

### Named Rules
**The Status Is Not Decoration Rule.** Good/warn/serious/crit appear only to report state, always beside an icon and a word. A green or red fill with no label is a defect.
**The One Blue Rule.** Blue marks something you can act on or where you are. It is never a background wash and never a status.
**The Ink Primary Rule.** One ink-black primary button per surface, and it follows the page's own recommendation: on an order stopped by a supplier timeout, Retry or reroute is black and Complete is outlined.
**The Count Is Not A Status Rule.** Tab and sidebar counts are neutral numbers. A small red dot appears beside Orders only when the number of orders past SLA is above zero.

## Typography

**Body and UI Font:** IBM Plex Sans (400, 500, 600) with system-ui fallback
**Data Font:** IBM Plex Mono (400, 500) for IDs, IPs, SKUs, journal numbers

**Character:** Plex's engineered neutrality suits a ledger: numerals are even and unambiguous, and the mono cut makes identifiers scannable without a second display face. Tabular, lining numerals are on everywhere.

### Hierarchy
- **Title** (600, 22px/28px, -0.01em): page heading, one per page.
- **Headline** (600, 16px/22px): dialog titles and empty-state titles.
- **Body** (400, 13px/18px): table cells, descriptions, form values. Line length stays under 70ch.
- **Label** (500, 12px/16px): field labels, column heads, badges, secondary lines in cells.
- **Data** (400, 12px/16px, mono): order IDs, supplier hosts, SKUs, journal numbers.

### Named Rules
**The Fixed Scale Rule.** Sizes come from the seven-step scale only. No fluid type inside the product; this is a tool, not a page.
**The Mono For Identifiers Rule.** Anything the operator may copy or search (IDs, IMEIs, hosts) is mono; everything they read is sans.

## Layout

A 232px sidebar and a fluid content column capped at 1480px, with a 48px sticky top bar carrying a Group / Page breadcrumb. The page gutter is 16px on small screens and 24px from 1024px up. Content stacks panels with 16px gaps; inside panels, rows keep a fixed height (40px, or 32px in Compact mode) so the eye can run down a column. Master-detail pages (Suppliers) use a 300px list beside a fluid detail panel and stack below 1024px. Tables scroll horizontally inside their panel on narrow screens rather than reflowing, and drop low-priority columns by breakpoint. Spacing steps are 4/8/12/16/24.

## Elevation & Depth

Flat by default. Depth is conveyed by hairlines and a one-step tonal change (paper, surface, sunken), not by shadow. A single shadow token exists, `0 12px 32px -8px rgb(0 0 0 / .22)` plus a 1px strong-hairline ring, and it is only used on things that float above the page: menus, dialogs, the drawer, toasts and chart tooltips. Dialog backdrop is 45% black.

### Named Rules
**The Flat-By-Default Rule.** Panels never carry a shadow. If it does not float, it does not cast one.

## Shapes

Small, quiet radii: 4px on badges and checkboxes, 6px on controls and nav items, 8px on panels, menus and dialogs. Full pills (9999px) are reserved for things that are literally a count or a bar: the count chip, meter and queue-composition tracks, avatars. Panels are never nested inside panels; sub-regions inside a panel are separated by hairlines. Borders are 1px hairlines; the only 2px strokes are the selected-tab underline and chart lines.

## Components

### Buttons
- **Shape:** 6px radius, 32px high (28px small, 32px square icon).
- **Primary:** ink-black fill, surface text. **Default:** surface fill, hairline-strong border. **Danger:** crit text on surface; the destructive confirm in a dialog uses the solid crit fill. **Ghost:** transparent until hover.
- **Hover / Focus:** hover is a one-step tonal shift (hover token) or 90% opacity on primary; focus is a 2px working-blue outline with 2px offset on every focusable element.

### Chips and segmented controls
- **Segmented control:** sunken track with a 1px hairline, selected segment lifts to surface with a strong hairline. Used for period and status filters.
- **Chip:** mono 12px on sunken, used for key shortcuts and filter toggles.

### Panels
- **Corner Style:** 8px. **Background:** surface on the paper page. **Border:** 1px hairline. **Header:** 44px min, title 13px/600 with a 12px muted subtitle. **Padding:** 14px.

### Inputs / Fields
- **Style:** 32px high, 6px radius, hairline-strong border on surface, 10px side padding, muted placeholder.
- **Focus:** border becomes working blue plus a 2px blue ring at 30%. **Error:** `aria-invalid` plus a crit message in the dialog's error slot; focus moves to the first invalid field.

### Tables
- **Header:** 32px, sunken, muted 12px/500, sticky, sortable columns carry a sort icon and `aria-sort`. **Rows:** 40px (32px compact), hairline bottom border, hover tint, whole-row click opens the detail drawer. Numerals right-aligned and tabular.

### Navigation
- 32px items, 13px/500, secondary ink; current page is sunken fill with an accent-ink icon. Section labels are 11px uppercase muted text. On small screens the sidebar becomes an off-canvas panel behind a scrim.

### Status badge (signature)
- 20px high, 4px radius, tinted background with strong foreground and an icon: Completed, Processing, Needs review, Rejected, Healthy, Degraded, Pending. The word is always present.

### SLA meter (signature)
- A 6px pill track that shows partial progress toward the service SLA and turns warn at 70%. Once an order is late the bar is dropped: the row says the elapsed time and "Late by 8m" in critical text, because a full red bar on every late row adds nothing.

### Queue composition bar (signature)
- One 6px track per service type, split into on-time (neutral), needs review (serious) and past SLA (critical) in proportion to the open orders. It shows what is wrong with a queue, not how big it is; the count sits beside it.

### Drawer, dialog, palette
- Native `<dialog>`. The order drawer is 580px from the inline-end edge with a sticky action footer; dialogs are 520px (760px for ledger entries); the command palette is a 600px combobox. Toasts live in a manual popover so they sit above open dialogs.

## Do's and Don'ts

### Do:
- **Do** put the queue and its actions first on every operational screen, with the consequence of a money-moving action written in the dialog before the confirm button.
- **Do** pair every status hue with an icon and a word, and every colour pair at 4.5:1 or better.
- **Do** show how a number was made (price resolver steps, ledger entries, trial balance checks).
- **Do** use mono for identifiers and tabular numerals for every amount.
- **Do** ship Loading (skeleton at the table's shape), Empty (what it is, what to do), Error (what failed, request ID, Retry) and Success (toast stating what changed) for every screen.

### Don't:
- **Don't** use gradients, glass, coloured shadows, or a shadow on anything that does not float.
- **Don't** nest rounded panels or use oversized hero KPI cards; summaries are compact cells in one panel.
- **Don't** use blue as a status or as a large fill; don't use a status colour for series.
- **Don't** introduce type sizes outside the seven-step scale or a second display face.
- **Don't** hide a destructive or money-moving action behind a single click with no review step.

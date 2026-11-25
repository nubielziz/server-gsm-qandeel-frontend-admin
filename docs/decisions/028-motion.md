# 028 Motion: pages and tabs come in, the selected mark slides

**Context.** On 2026-11-26 the owner asked for animation in the whole console, "like when you swap between tabs or switch pages in the
sidebar". Until then a page or a tab changed at once; only dialogs, drawers, menus, skeletons and the notification bell moved. The lead
told the owner the plan below before any code, and the owner agreed.

**Decision.**
- **A new page comes in.** Following a sidebar link (or going between a list and a record) fades the page in while it rises 6 px, in
  200 ms. The sidebar and the top bar stay still. It plays on `<main>`, when the page's own content shows (`PageEnterMark` inside the
  page's Suspense boundary in `PageRoute`), so never on the loading skeleton, never for the first page after the console loads, and
  never for a tab, a view, a filter or a query parameter of the same page.
- **The selected mark slides.** The highlight of the current sidebar link, the line under the selected tab (`Tabs`, `SectionTabs`) and
  the raised box of the strip tabs (`StripTabs`: Product / Services, Money, Accounts) are each one element (`SlidingMark`) that slides
  to the new item in 300 ms. The first placement and a resize jump. Until the script has placed it (`data-indicator`), and in tests,
  the item draws its own selected look on the same pixels, so nothing moves when the mark takes over.
- **Tab content comes in from the side of the tab.** The content under a tab strip fades in while it moves 8 px, from the end side for a
  tab further on and from the start side for an earlier one (`useTabEnter`). A list that keeps its old rows while the new tab loads
  (Orders, the Accounts chips, the people picker) plays when the new rows are there (`ready`), never on the old ones.
- **Enter only.** Nothing is remounted, delayed or played on the way out, so a page keeps its state and its speed. Tables and live
  numbers do not animate when they refresh. Dialogs, drawers and menus keep the animations they had.
- **How.** `src/lib/motion`: the Web Animations API for the enters (no fill: nothing stays on the element), CSS transitions for the
  marks, no library. Transform and opacity only, except the marks' width and height (absolutely positioned: their size change lays out
  nothing else). The lengths are tokens (`--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 300 ms; the first two
  are mirrored in `src/lib/motion/tokens.ts`), the same names and curves as the website's.
- **Reduced motion.** With "reduce motion" no enter plays and the marks jump.
- **The sidebar's highlight is visible now.** Its colour was `sunken`, which is the sidebar's own colour to one step in the light theme,
  so a slide could not be seen. The current link and the mark use `line` at 60 %: a soft pill in light, the old look in dark.
- **The content column clips its overflow** (`overflow: clip` in `AppShell`): a page that rises or a tab that comes in from the side
  must not make the window scrollable for 200 ms. Menus, tips and dialogs are fixed or in the top layer and are not clipped.

**Consequences.**
- No route, no API call and no data changes: the backend's contract of the console is the same.
- A new tab strip gets the sliding line for free (`Tabs`); its content gets the enter by attaching `useTabEnter`'s ref to the element
  that holds it. A new page gets the page enter for free (`PageRoute`).

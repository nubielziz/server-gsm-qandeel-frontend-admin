# 016 Formatting money, numbers and time

**Context.** The demo formats with `money`, `money0`, `price`, `num`, `pct`, `fmtDate`, `fmtDay`, `fmtTime`, `ago`, `dur`, `fmtImei` (00-util.js) using `Intl`. The API sends money as 4-decimal strings and dates as ISO strings in UTC.

**Decision.** `src/lib/format` ports those helpers with the same output, built on `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` (no date or decimal library). Money strings are formatted, never used for arithmetic that decides anything; sums, balances and prices come from the server. `useNow(intervalMs)` re-renders "x min ago" and SLA cells (the demo refreshed every 30 s).

**Consequences.** Same visible text as the demo; zero formatting dependencies; no float rounding of money on the client.

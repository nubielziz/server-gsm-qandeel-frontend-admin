# 030 The Options section and the Pattern column are removed

**Context.** On 2026-11-26 the owner ruled that the Field part of a service's edit view loses two things. The Options section (the Models,
Networks and MEP boxes, one entry per line as `value | label | supplier value`) is not used: the backend retires `PUT /admin/services/:id/options`
in its decision 072. The Pattern column of the Custom Fields table is not used by staff either: all 354 patterns on production were made by the
supplier import from the supplier's lengths and none was typed by a person. They keep protecting orders, so a save must not lose them.

**Decision.**
- **Options is gone.** The section, its form hook, the line helpers (`optionLines`, `parseOptionLines`, `blankValueLine`, `entriesText`), the
  `OPTION_LISTS` words, `replaceServiceOptions`, `useReplaceOptions`, the mock route and the seeded lists, the types `ServiceOption`,
  `ServiceOptionList` and `ReplaceOptionsBody`, and their tests are removed. The Field part has two sections: Quantity Field and Custom Fields.
  `lib/options.ts` stays for the choices of a choice list and the field type menu.
- **The service read.** `GET /admin/services/:id` may still send an `options` array. `ServiceDetail` no longer types it and nothing reads it;
  an unknown key in an answer is ignored, so the console does not break while the backend change is not live.
- **The Pattern column is gone.** The table has the columns No., Name, Label, Type, Required and Actions (decision 024 listed Pattern too).
  The draft keeps `regex` as a hidden value, exactly as it keeps the hidden `key`: a saved field sends its pattern back untouched (not even
  trimmed), a new row sends `''`. The body of `PUT /admin/services/:id/fields` is unchanged.
- **Errors.** A server message on `fields.N.regex` shows under the row's Name input, as the messages about the hidden key and the main-input
  flag do.
- **The words.** The Custom Fields intro no longer explains a pattern. It says a field made by the supplier import keeps the answer pattern the
  import gave it, that the pattern is not shown, and that a save leaves it as it is.

**Consequences.**
- Staff can no longer add, change or clear a pattern in the console; only the supplier import sets one. A save never loses a saved pattern.
- `PUT /admin/services/:id/options` is no longer called. It is listed as retired in `scripts/check-route-coverage.mjs` and
  `docs/ROUTE_COVERAGE.md` is made again. The route files generated from the backend's contract (`src/mocks/liveRoutes.gen.ts`, `npm run
  mocks:live`) are made again once the backend carries its decision 072.
- Decision 022's list of reused helpers (`lib/options.ts`) and decision 024's table are superseded on these two points.

# 029 The order form draws only a service's custom fields

**Context.** The shop's order forms used to draw a built-in box for the order's input (the IMEI, an account, a serial number) and then the
service's custom fields. On 2026-11-26 the owner ruled that the forms draw only the custom fields. There is no built-in IMEI box any
more: on an IMEI service the buyer types the IMEI into the custom field marked **Main input** (decision 024). No API change touches the
console; this is the console's side of the wording and of one warning.

**Decision.**
- **The empty line is true again.** A service with no custom fields shows "No custom fields. The order form shows no input box: add the
  fields the buyer must fill in." (It used to say the buyer only gives the main input.)
- **The words about the main input.** The Custom Fields intro says the order form shows only these fields. The tooltip of a row's main
  input switch says it is the field the order itself is about, such as the IMEI, and that on an IMEI service the buyer types the IMEI in it.
- **A warning, not a block.** When the service's type is `imei` and no row of the section's current draft is the main input, the section
  shows a warning (the editor's tinted note with the alert icon, `MainInputWarning`): "This IMEI service has no main input field. Buyers
  cannot order it in the shop until one field is marked Main input." It follows the draft as rows are added, removed or switched, and it
  never disables Save: a list is often built in several saves, and the server decides what a service may hold. Other types never show it.
- **Where the type comes from.** The Field part already receives the saved service, so the section reads `service.type`; nothing new is
  loaded or passed down.

**Consequences.**
- An existing IMEI service whose fields have no main input shows the warning on its Field part from now on and is not sold in the shop
  until staff mark one field. The console does not list such services; the warning is the only signal.
- The mock layer is unchanged: on an IMEI service it still marks a row named IMEI as the main input when no row is flagged, as the server
  does when the list is saved. The warning reads the draft as typed, so it can show for such a row until the save.
- Decision 024's sentence "the box a service's order is about" now means the custom field the order is about, not a separate box.

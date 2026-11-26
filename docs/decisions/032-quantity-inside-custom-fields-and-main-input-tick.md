# 032 The quantity sits inside Custom Fields, and the main input is a tick box

**Context.** On 2026-11-26 the owner ruled two changes on the Field part of a service's edit view. The quantity is part of how a service is
ordered, so it belongs with the order fields, under one Save. And the main input control (an icon button in the Actions column with a blue
badge beside the name, decision 024) is replaced by a plain tick box column. Console only: the routes stay `PATCH /admin/services/:id` for the
quantity and `PUT /admin/services/:id/fields` for the fields, and neither body changes.

**Decision.**
- **One section.** The Field part has one section, Custom Fields. The "Quantity Field" heading, its form, its Save and the rule between the two
  sections are gone (`fields/QuantitySection.tsx` is merged into `CustomFieldsSection.tsx` and deleted). Under the table and its "Add a field"
  button come the Quantity menu (One per order, A range, Fixed packs) and the boxes that way needs (Smallest and Largest; Pack sizes), with
  the same hints and checks as before (`lib/quantity.ts`). One Save sits under them.
- **Two forms, one Save.** `useFieldsSectionForm` holds `useCustomFieldsForm` and `useQuantityForm` as they were (two form objects) and gives
  the section one `dirty` and one `submit`. The section is dirty while either form is, and the part reports that one flag to the host (the
  question before unsaved changes). The permission lock (`catalog:update`) stays on every input.
- **What a save sends.** Only what changed: the fields (PUT) when the fields are dirty, then the quantity (PATCH) when the quantity is dirty,
  both in that order when both are. A part that fails does not stop the other: a failure of the browser's checks counts too, so a mistake in
  the quantity boxes does not hold back the fields. The part that saved is reset and clean; the failed part stays dirty with its messages under
  its own inputs (each form keeps its own server-error mapping), a message that belongs to no input goes to the section's failure line, and
  Save stays on. The toasts of the parts that saved ("Fields saved", "Quantity saved") stay. When the only dirty part is a quantity typed back
  to the saved rule, nothing is sent and the toast says "Nothing changed"; next to a fields save it says nothing.
- **The main input is a column.** The table has the columns No., Name, Label, Type, Required, Main input and Actions. Main input holds one tick
  box per row (the kit's checkbox, like Required), named "Main input of field N". Ticking a row unticks the others (`withMainInput`);
  unticking leaves the service with none. Each tick box is registered like the Required box: a server message about the flag (`fields.N.isMainInput`)
  shows on its own box (invalid, with an error line in its cell), no longer under Name, and every box points (`aria-describedby`) at the intro
  sentence below. The icon button and the badge are removed, and with them the tooltip of the old button: the
  Custom Fields intro now says what it is ("Main input: the one field the order is about (IMEI, serial, ECID). The supplier receives it as the
  IMEI, and order lists show it."). Actions keeps move up, move down and remove. `MainInputWarning` is unchanged.
- **The words.** The intro is shortened: one sentence each for the name and the label, the IMEI type and the hidden pattern, then the main
  input sentence above.

**Consequences.**
- Decision 024's description of the main input control (badge, icon button) and decision 029's tooltip sentence are superseded. Decision 030's
  "two sections: Quantity Field and Custom Fields" and decision 022's list of the part's sections are superseded: there is one.
- `TextCell` loses its `trailing` slot (the badge was its only user). `useQuantityForm` no longer toasts "Nothing changed" itself: its
  `submit` answers `QUANTITY_UNCHANGED` and the section decides.
- The kit's `SectionForm` keeps its `actions` and `placement="edge"` options; no screen uses them now except its own test.

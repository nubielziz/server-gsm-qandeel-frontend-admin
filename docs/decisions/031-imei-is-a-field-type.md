# 031 IMEI is a field type, and an IMEI service forces nothing

**Context.** On 2026-11-26 the owner ruled that an IMEI service no longer forces an IMEI. The IMEI box is only the default field, and staff may
change or remove it freely. Decision 029 had said that an IMEI service with no main input cannot be ordered in the shop; that is no longer true.
The wire fact is shared by the backend, the shop and this console: a custom field gains a fifth type, the string `imei`.

**Decision.**
- **The fifth type.** `ServiceFieldType` is `text | number | select | textarea | imei`. The type menu of the Custom Fields table offers it as
  "IMEI (15 digits)", last, for every service type. A field of this type holds one IMEI: the server reads the answer as digits (spaces and dashes
  removed) and accepts 15 digits with a valid Luhn check digit. A problem comes back on `inputs.<key>` with the code `invalid_imei` (the response
  code stays `INVALID_IMEI`, 422). The console checks nothing of this: the server judges, and the Custom Fields intro only says what the type takes.
- **The order form.** The order form of an IMEI service is its custom fields, each judged by its own type, its Required tick and its pattern.
- **The advice is reworded.** `MainInputWarning` still shows only on an IMEI service whose draft has no main input, still follows the draft and
  still never blocks Save. It now reads: "No field is marked Main input. Mark the field the order is about (the IMEI, a serial, an ECID) so the
  supplier receives it." The tooltip of the main input switch no longer says the buyer types the IMEI in it: the field is the one the order is
  about, and the supplier receives it as the order's own input.
- **The mock plays the backend.** `POST /admin/services` with the type `imei` gives the service the default field: Name and label IMEI, type
  `imei`, required, main input (`mocks/defaultFields.ts`); the other types start with no field. The rule "a field named IMEI is the main input
  when no row is flagged" stays, and `PUT /admin/services/:id/fields` accepts the type `imei`. The demo seed has no field that stands for an IMEI
  box (its IMEI services have no field), so no seed row changes.

**Consequences.**
- Decision 029's warning words and its sentence that an IMEI service "is not sold in the shop until staff mark one field" are superseded; its
  other points (the form draws only the custom fields, the empty-list line) stand.
- Changing the type of a service to IMEI later does not add the default field in the mock; only creating one by hand does.
- `src/lib/api/schema.gen.ts` types `fieldType` as a plain string and is left as it is.

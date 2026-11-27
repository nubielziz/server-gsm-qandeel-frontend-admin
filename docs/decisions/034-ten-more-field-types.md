# 034 Ten more field types

**Context.** Decision 031 gave the Custom Fields a fifth type, `imei`. On 2026-11-27 the backend added ten more kinds of field that it checks and
cleans itself (its decision 076). The release order is the backend's: this console first, then the backend, then the shop; until the
backend is released, a save with a new type is refused (`422` on `fields.N.fieldType`) and nothing breaks. The wire fact is shared: `fieldType` takes fifteen values. The console only names the
type; the server judges the answers of an order and returns the codes below on `inputs.<key>`.

**Decision.** The type menu of the Custom Fields table offers fifteen types for every service type, in this order: Text, Number, Choice list, Long text,
then the eleven checked ones. A save sends the type as it is and the saved list comes back with it (`lib/fields.ts` keeps the type through the row
and back; nothing in it depends on the value except `select`, which keeps its choices).

| type | menu label | the server stores | valid when | server code |
|---|---|---|---|---|
| `imei` (031) | IMEI (15 digits) | spaces and dashes removed | 15 digits, Luhn | `invalid_imei` |
| `imei_bulk` | IMEI list (one per line, up to 30) | split on line breaks, commas and semicolons; empty items dropped; spaces and dashes removed in each; joined with a line break | 1 to 30 items, each 15 digits with a valid Luhn digit, none twice | `invalid_imei`, `too_many_imeis`, `duplicate_imei` |
| `imeisv` | IMEISV (16 digits) | spaces and dashes removed | exactly 16 digits | `invalid_imeisv` |
| `serial` | Serial number | spaces removed, upper-cased | 5 to 30 letters A-Z and digits | `invalid_serial` |
| `iccid` | ICCID (SIM number) | spaces and dashes removed | 18 to 22 digits, starting with 89 | `invalid_iccid` |
| `eid` | EID (eSIM, 32 digits) | spaces and dashes removed | exactly 32 digits | `invalid_eid` |
| `meid` | MEID | spaces and dashes removed, upper-cased | 14 or 15 hexadecimal characters, or 18 digits | `invalid_meid` |
| `ecid` | ECID | spaces removed, upper-cased (a leading `0x` stays `0x`) | optional `0x` then 8 to 16 hexadecimal characters; or 8 to 20 digits | `invalid_ecid` |
| `mac_address` | MAC address | `AA:BB:CC:DD:EE:FF` | 12 hexadecimal characters, alone or separated by `:` or `-` (pairs) or `.` (groups of four) | `invalid_mac_address` |
| `mi_lock_code` | Mi lock code | as typed (trimmed) | 6 to 64 letters, digits and dashes | `invalid_mi_lock_code` |
| `box_sn` | Box serial number | spaces removed, upper-cased | 4 to 32 letters, digits and dashes | `invalid_box_sn` |

- **The help.** "How this works" gains one short line per checked type ("Type "ICCID (SIM number)": 18 to 22 digits, starting with 89."), written once in
  `lib/options.ts` (`FIELD_TYPE_HELP`) next to the menu labels. The order of the lines is the order of the menu.
- **The mock plays the backend's list.** `PUT /admin/services/:id/fields` accepts the fifteen types on any service type and refuses any other with
  "Choose a type." on `fields.N.fieldType`. It checks nothing of the answers (the console has no order screen that types into a field).
- **Nothing else draws by type.** The console has no preview of an order form, and the hidden pattern (decision 030) is sent back untouched whatever the
  type, so no other place changes. `imei_bulk` is a multi-line value only for the shop and the server.

**Consequences.**
- `ServiceFieldType` is a union of fifteen strings; `src/lib/api/schema.gen.ts` types `fieldType` as a plain string and is left as it is.
- Decision 031's sentence "a custom field gains a fifth type" is now one step of fifteen; its other points stand.

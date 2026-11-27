# 035 Fewer inputs: remove, fold and menu

**Context.** On 2026-11-27 the owner asked to reduce how much staff must type in the console and agreed a numbered list of inputs. Each item is one
of three kinds of change, and every one of them keeps the wire format of a form left at its defaults: the request body is the same as before
(each form's tests prove it by the body it sends). This file holds the rule and the items of the Services, Suppliers and Accounts features
(#1 to #13 and #23 to #26); the other console features add their items in their own file.

## The rule of the fold

- **Remove.** The input is gone. The console sends the fixed or computed value, or leaves the key out where the server makes the value.
- **Hide.** The input moves into the kit's `<MoreOptions>` fold (`@/components/ui`, label "More options"), one fold per form, after the visible
  inputs. The hidden input keeps its present default and is still sent as before; it stays in the page while folded, so the form keeps its value.
  The fold **starts open** (`defaultOpen`) when a record being edited holds, in any hidden input, a value that is not the default, and is **forced
  open** (`forceOpen`) while any hidden input has an error, a check of the browser or a message of the server, so nothing wrong is out of sight.
- **Menu.** A typed text becomes a choice. A stored value the menu does not know stays chosen and is shown as it is.

## Items

| # | Where | Change |
|---|---|---|
| 1 | Custom fields of a service | The Label column is hidden. One tick box above the table, "Show buyers a different label", draws it for every row. It starts ticked when a saved label differs from its name (spaces ignored; an empty label means the name) and is forced on, and cannot be unticked, while a label cell has an error. While the column is hidden every row sends an empty label, so the server stores the name and a renamed field's label follows it; while it is shown, rows send what is typed. Unticking the box on a service whose labels differ is a change of its own and can be saved. The help text says what the label is for. |
| 2 | Import codes (dialog and the Inventory part) | Batch reference moves into the fold; it is still sent only when typed. |
| 3 to 7 | Pricing rule dialog | Priority, Rounding, Minimum profit, Starts and Ends move into the fold, keeping the defaults of a new rule (100, no rounding, empty, empty, empty). Visible: Applies to, the target, Type, Rank, Percentage, Fixed amount. Editing a rule that holds a folded value that is not the default starts the fold open. |
| 8 | Connect supplier | Currency is removed. A new supplier is sent `currency: 'USD'` (the server refuses any other: costs are kept in the base currency). |
| 9 | Connect supplier | API type is removed. A new supplier is sent `driver: 'dhru'` (the REST driver cannot be called yet). `DRIVERS` and `driverLabel` stay for the list and the Connection panel. |
| 8, 9 on edit | Edit connection | Neither is shown nor sent. A supplier whose driver is not Dhru or whose currency is not USD shows both as a read-only line, so a stored value is never hidden. |
| 10 to 13 | Connect and Edit connection | Alert below, At a time, Per minute and Timeout move into the fold. Left empty they are left out of the body, as before. Visible: Name, Base URL, Username, API key. Editing a supplier whose alert or limits are not 150, 5, 60 and 15000 starts the fold open. |
| 23 | +Add Account, merchant rank | Country becomes a menu of every ISO 3166-1 country, "Name (CODE)" sorted by name, with "Choose a country" first. The retail menu is unchanged. |
| 24 | Profile part, merchant | The same menu. A stored code the list does not know stays chosen and is shown as the code. The value sent is the two-letter code in upper case, as before. |
| 25, 26 | New API key | Expires on and Limit a minute (60) move into the fold. Visible: Name, Allowed addresses. |

## Decisions of detail

- **The country list** is built once, on first use, in `features/accounts/components/shared/countries.ts` (`allCountries`, `merchantCountryOptions`):
  the 249 assigned alpha-2 codes are written there and their English names come from `Intl.DisplayNames`, so there is no new dependency and no list of names to keep.
  The retail list stays the shop's twelve countries.
- **An empty label** counts as "the name" when deciding whether the Label box starts ticked: only a label that says something else opens the column.
- **The supplier form values** no longer hold `driver` and `currency` (`SupplierFormValues`, `SUPPLIER_FIELDS`); a server message about either falls to the dialog's error slot.

## Consequences

- No route, type or contract changes: the bodies sent for a form left at its defaults are the ones sent before, except item 1, where a hidden Label column sends an empty label on purpose.
- Where a test typed into a folded input, it now opens the fold first, as a person would.

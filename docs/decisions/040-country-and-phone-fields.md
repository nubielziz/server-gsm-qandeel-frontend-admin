# 040 Country menus with search and flags, and a phone box with calling codes

**Context.** On 2026-11-28 the owner asked for the console's select inputs to be checked and changed to "the same new input fields" the shop's website got that
day: a country menu a person searches instead of scrolling, with a flag beside every name, and a phone box that shows the flag of the number's country and
offers the calling codes. The console had 115 `SelectField` menus; seven of them choose a country, and two text boxes hold a phone number.

**Decision.**
- **`CountryField`** (`src/components/ui`) replaces `SelectField` wherever the menu is a list of countries: a button with the flag and the name, and a panel
  (`FloatingPanel`) with a search box and the list (`CountryList`). It takes the same `options` as before (`value` is the two-letter code, an empty value is the
  choice that means "none": "Any country", "Choose a country", "No country"), so each menu keeps its own list and its own words ("Jordan (JO)", "Country PL",
  "(saved before)"). Seven menus: Country in +Add Account and in an account's Profile (both kinds of rank), the Country filter of Quick Search, Country in
  "Add tax rate", and Country of a listing's facts (the shop dialogs and the Product / Services edit view).
- **`PhoneField`** replaces the Phone text box of +Add Account and of Profile: the flag follows the number as it is typed (`+962` or `00962`), a button opens the
  list of calling codes (search by name or by `+44`), and choosing a country writes its code before the number. The value is still the text as typed; the server
  still judges it. A box that holds only a calling code is sent as an empty phone (`isOnlyDialCode` in `addAccountForm` and `profileForm`), and a whole number
  pasted after a lone code replaces the code (`typedPhone`).
- Both are controlled. A react-hook-form form drives them with `useController` (the `field`'s value, change, blur, name and ref) instead of `register`, because
  neither is a native input the form could read by itself. In a dialog the field that should get the focus carries `data-autofocus` (`autoFocus` sets it).
- **No new package.** Flags are the MIT "circle-flags" files by HatScripts (`https://github.com/HatScripts/circle-flags`, the `flags/` folder of its `gh-pages`
  branch, copied 2026-11-28) in `public/flags/<code>.svg`, one for every code of `src/lib/isoCountries.ts` (`scripts/country-flags.test.mjs` fails when one is
  missing; `Flag` draws the globe icon for a code with no file). Calling codes are a copy of libphonenumber's data (`src/lib/phone/dialData.ts`, read through
  `src/lib/phone/dial.ts`), the same two files as the website's `lib/phone`.
- **Left as they were:** the other 108 menus (ranks, statuses, kinds, currencies and so on) are short lists with no flag to show, and a native select serves
  them. Three boxes take a country as typed text, not from a menu, and stay text: the "Countries" lists of a campaign's audience (several codes separated by
  commas) and the Country code of a row of a publish draft and of its bulk dialog. Turning those into menus is a change of what they accept, not of how they look.

**Consequences.**
- A country menu is no longer a `<select>`: a test chooses a country with `chooseCountry` and reads the rows with `countryRowTexts`
  (`src/components/ui/testing/countryField.ts`), and reads the chosen code from the button's `data-value`.
- The demo draws native selects (MISMATCHES M374).
- The list is placed once, when it opens, as every panel of the kit is; it gets shorter while a search narrows it, and keeps its height when it had to open
  above its control.

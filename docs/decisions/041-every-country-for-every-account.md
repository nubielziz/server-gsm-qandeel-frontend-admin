# 041 Every country for every account

**Context.** On 2026-11-28 the owner asked why +Add Account offers only some countries, and ruled that every country must be there. The Country menu of a
retail account (in +Add Account and in Profile) and the Country filter of Quick Search held twelve countries, a list ported from the demo
(`B2C_COUNTRIES`); only a merchant rank picked from every ISO country (decision 035). The backend's rule is not that list (its decision 079): a retail
account may have any country while the shop has no tax rate in force, which is production today, and only the countries of the tax rates in force otherwise.

**Decision.**
- One Country menu for every account: "Choose a country", then every ISO 3166-1 country as "Name (CODE)" (`countryOptions` in
  `accounts/components/shared/countries.ts`, which was `merchantCountryOptions`). The twelve-country list is gone.
- +Add Account starts with no country chosen for either kind of rank, and asks for one ("Choose a country."). It used to start a retail account on the
  first country of the old list (United Kingdom); among 249 countries a country chosen for the person is a wrong country waiting to be saved, and it sets
  their currency and VAT. Changing the kind of rank no longer changes the country: both kinds use the same menu.
- Profile: the same menu. An account that has a country cannot be saved without one; a guest saved with none may stay without.
- The Country filter of Quick Search lists every country by name; a code of the address that is not a country still shows as "Country XX".
- `countryName` names any country, so Overview writes "JO · Jordan" where it wrote "JO".

**Consequences.**
- When the shop has tax rates in force, the menu offers countries the server refuses for a retail account; its "Choose a country." shows under the menu
  (the server is the authority, decision 008). The mock shop has tax rates and plays that rule.
- MISMATCHES M375.

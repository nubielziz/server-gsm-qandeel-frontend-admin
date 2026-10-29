# 008 Forms and validation

**Context.** Forms are mostly small dialogs (suspend with reason, adjust wallet, add IP rule) plus a few resource editors (staff, services, listings). The server is the validation authority (its OpenAPI comes from zod on the server); the client should help, not duplicate rules.

**Options.** (a) react-hook-form + `@refinedev/react-hook-form`, built-in rules only. (b) Same + zod schemas mirrored from the server. (c) Uncontrolled forms like the demo.

**Decision.** (a). Resource create/edit uses `@refinedev/react-hook-form` `useForm` (mutation, invalidation, server field errors built in). Action dialogs use plain `useForm` from react-hook-form with the typed mutation hook and `applyServerErrors`. Client rules are UX hints only: required, simple formats (email, IPv4/CIDR shape, IMEI 15 digits), lengths stated by the map (password ≥ 10). Field components (`TextField`, `SelectField`, `TextareaField`, `CheckboxField`, `RadioGroup`) render label, hint, `aria-invalid` and the error text in the demo's style.

**Why not zod.** It would copy server rules into the client and drift; react-hook-form rules cover the hints we need with no extra dependency.

**Consequences.** Any rule the server adds shows up as a server field error without client changes.

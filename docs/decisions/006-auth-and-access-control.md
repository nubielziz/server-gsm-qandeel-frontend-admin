# 006 Auth and access-control providers

**Context.** Map rules: admin uses an httpOnly session cookie + `X-CSRF-Token` header on any mutation, 2FA is mandatory, every route checks a `resource:action` permission from `roles.permissions` (`:*` = all actions). Routes: `POST /admin/auth/login` (email + password, then a TOTP step), `POST /admin/auth/2fa`, `POST /admin/auth/2fa/setup` (first sign-in: secret + QR), `POST /admin/auth/logout`, `GET /admin/auth/me` ("the staff member and permissions for Refine"), `POST /admin/auth/password/set` (one-time token from an invite or reset link). IP rules are checked before the password. The demo's role matrix (`ROLE_MATRIX`) is only a UI reference.

**Decision.**
- `authProvider` (Refine v5 shape): `login` handles both steps (`{email,password}` then `{code}`) and returns `redirectTo` for the next step; `check`/`getIdentity` read `me` (cached query, 401 → `/login`); `getPermissions` = `me.permissions`; `onError` signs out on 401, `ACCOUNT_SUSPENDED` and `IP_NOT_ALLOWED` (with a reason shown on `/login`), never on `FORBIDDEN`; `logout` calls the API then clears the query cache.
- `accessControlProvider.can`: `action` is a permission string (`staff:suspend`); a granted `x:*` or `*` matches. CRUD rows marked `x:*` map to `x:read` (list/show), `x:create`, `x:update`, `x:delete`. Pages declare the permission they need for the nav (`orders:read`…).
- Client guards (cannot suspend yourself, keep one active Owner, cannot block your own IP, cannot turn on the allowlist from outside it) are disabled states with a reason; the server's error is still shown if it refuses.

**Assumed contract (not specified by the map; confirm with the backend, logged in MISMATCHES).**
1. `login` answers `{ next: "totp" | "totp_setup" | "password" }` and sets a pre-2FA session; `"password"` means a temporary password must be replaced first.
2. `2fa/setup` answers `{ secret, otpauthUrl, qrSvg? }`; the first code is then sent to `POST /admin/auth/2fa` `{ code }`, which completes sign-in.
3. `me` answers `{ id, email, name, status, role: { id, name }, permissions: string[], twofaEnabled, mustChangePassword, lastLoginAt, lastLoginIp }`.
4. `password/set` takes `{ token, password }`, or `{ password }` with the pre-2FA session for the temporary-password case.
5. CSRF token: readable cookie named by `VITE_CSRF_COOKIE` (default `csrf_token`), else the last `X-CSRF-Token` response header. CORS must allow credentials and expose `x-total-count`, `x-request-id`, `x-csrf-token`.

**Consequences.** Permissions come from the server only. Each assumption is isolated in one function (`lib/api/csrf.ts`, `features/auth/api`), so a different backend answer is a one-file change.

// Types of the staff security tools on an account (`/admin/clients/:id/password|reset-2fa|sessions/revoke|verify-email/resend`):
// every account with a login (a guest answers 409 `NO_ACCOUNT`). Shapes come from the backend's security contracts.
import type { PasswordMode } from './account';

/** Body of `POST /admin/clients/:id/password`. `revokeSessions` ends every session of the account. */
export type AccountPasswordBody = { mode: PasswordMode; revokeSessions: boolean };

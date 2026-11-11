// Types for the staff security tools on a merchant (backend feature 20, routes R1-R4 of `/admin/clients/:id`): the password
// dialog's body and answer. Shapes come from `client-security.contracts.ts` of the backend.

/** How a merchant gets a new password: a link to choose one (an invitation while they have none), or a temporary one. */
export type ClientPasswordMode = 'reset_link' | 'temporary_password';

/** Body of `POST /admin/clients/:id/password`. `revokeSessions` ends every session of the merchant. */
export type ClientPasswordBody = { mode: ClientPasswordMode; revokeSessions: boolean };

/**
 * The answer of `POST /admin/clients/:id/password`: `link` says which mail went out (`invite` while the merchant has no
 * password, else `reset`), `temporaryPassword` is the new password, shown once. The link itself is never returned.
 */
export type ClientPasswordResult = { temporaryPassword?: string; link?: 'invite' | 'reset' };

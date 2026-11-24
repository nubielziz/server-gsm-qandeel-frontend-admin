// What the app needs to know about the Accounts page without loading it: its heading and the gate that opens it. The manifest
// (../../manifest.ts) is loaded with the app, so this file must stay free of the page's views.

/** The page's heading, the same in every view and on a record (the sidebar label is the same word). */
export const ACCOUNTS_HEADING = 'Accounts';

/**
 * The page gate (the feature manifest's `permission`, the same list as the page resource in src/app/resources.ts): any one of these opens
 * the page. The accounts need `clients:read` and the ranks `groups:read`; a role with only the second lands on Ranks. The server still
 * checks every call.
 */
export const ACCOUNTS_PAGE_PERMISSIONS = ['clients:read', 'groups:read'] as const;

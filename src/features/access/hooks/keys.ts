// Query keys of the access reads that are not Refine resources (decision 005: they start with `['api', <feature>]`).
// A mutation lists the keys it makes stale; React Query matches them as prefixes.

/** Open sessions of staff and merchants (every filter and page). */
export const SESSIONS_KEY = ['api', 'access', 'sessions'] as const;

/** The permission catalog behind the role dialog. */
export const PERMISSIONS_KEY = ['api', 'access', 'permissions'] as const;

/** Answers of `POST /admin/ip-rules/check` for an address and an audience; stale after any rule or restriction change. */
export const IP_CHECK_KEY = ['api', 'access', 'ip-check'] as const;

// Query keys of the notifications reads (decision 005: they start with `['api', <feature>]`) and how often the live views ask again. React Query
// matches keys as prefixes, so one key refreshes every page, filter and tab of its family.

/** Every campaign read: the list, one campaign and its recipients. A write of any campaign refreshes this whole family. */
export const CAMPAIGNS_KEY = ['api', 'notifications', 'campaigns'] as const;
/** The staff member's own inbox: the bell's list and its unread count. */
export const INBOX_KEY = ['api', 'notifications', 'inbox'] as const;
export const UNREAD_KEY = ['api', 'notifications', 'unread'] as const;

/** How often a campaign that is still being sent asks for news (the plan says every 5 seconds). */
export const CAMPAIGN_REFRESH_MS = 5_000;
/** How often the bell asks for the unread count while the tab is visible and the live stream is not open (the stream is the fallback's reason to be). */
export const UNREAD_REFRESH_MS = 60_000;
/** The same, while the live stream is open: a slow safety net (5 minutes) for an event that never came. */
export const LIVE_UNREAD_REFRESH_MS = 300_000;
/** The bell's list shows this many items at first and this many more on each "Load more". */
export const INBOX_PAGE_SIZE = 20;

/** The pickers' lists ask for this many roles or groups at once (the server's page ceiling). */
export const OPTION_LIMIT = 100;
/** People per page in the picker dialog. */
export const PEOPLE_PAGE_SIZE = 10;
/** The live count waits this long after the last change before asking the server. */
export const COUNT_PAUSE_MS = 400;

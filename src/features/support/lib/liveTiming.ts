// The numbers of the support chat's live behaviour (feature 28, plan §2 and §4.1), in one place so the hooks and their tests agree on them.

/** The console sends "I am typing" at most once in this time while the draft changes (the server keeps one event per 2.5 s). */
export const TYPING_SEND_MS = 3_000;
/** Someone else's typing line stays this long after its last event, and goes at once when that person's message arrives. */
export const TYPING_SHOW_MS = 6_000;
/** After a colleague's public reply arrives, the composer warns for this long when it holds a draft. */
export const COLLISION_MS = 30_000;
/** A burst of ticket events asks the server for the inbox, the counts and the dashboard at most once in this time. */
export const INVALIDATE_MS = 5_000;
/** At most one alert sound in this time, so a burst of messages is one beep. */
export const SOUND_GAP_MS = 1_500;

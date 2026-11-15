// One AudioContext for the whole console page, shared by the notification bell's chime (features/notifications) and the support
// alert sound (features/support, feature 28). Two contexts would hold two audio devices, and a test of the page saw both start on the
// same first press; one context unlocked by the first gesture serves both sounds.

type AudioContextConstructor = typeof AudioContext;

let cached: { ctor: AudioContextConstructor; context: AudioContext } | null = null;

/**
 * The page's audio context, created on first use (call it inside a user gesture, when a browser lets audio start). Null where the
 * browser has no Web Audio. A swapped constructor (a test's fake) or a closed context gets a new one.
 */
export function sharedAudioContext(): AudioContext | null {
  const scope = globalThis as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (typeof Ctor !== 'function') return null;
  if (!cached || cached.ctor !== Ctor || cached.context.state === 'closed')
    cached = { ctor: Ctor, context: new Ctor() };
  return cached.context;
}

/** Forgets the page's context, so the next use makes a new one. Tests only: each test starts with its own fake audio. */
export function resetSharedAudioContext(): void {
  cached = null;
}

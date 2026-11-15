// The bell's arrival sound (owner, 2026-11-15: "add a light sound when a notification arrives"; the website's bell has the same chime): a short, soft
// two-note chime made with the Web Audio API (no audio file). The bell's rules decide when (lib/bellMotion.ts asks for it with each ring it takes: a live
// arrival in the visible tab, at most once every 3 s, never on load, a poll, a replay or a resync). It plays with reduced motion too (a sound is not
// motion), never while "Notification sound" is off in the Display menu, and it is extra feedback only: the number and the button's name do not change.
// Browsers start audio only after a user gesture, so the page's one AudioContext is created (or resumed) on a pointer or key press, through passive
// listeners that go away once it runs. Until then a ring plays nothing: no error, no retry. Pure: the context, the gestures and the setting are passed in
// (hooks/useBellMotion.ts wires the browser).

/** One note: its pitch (Hz), when it starts after the first one and how long it sounds (seconds), and its loudest gain. */
export interface ChimeNote {
  hz: number;
  at: number;
  length: number;
  peak: number;
}

/** Two soft sine notes a fifth apart, the higher one a little quieter: a quarter of a second in all. */
export const CHIME_NOTES: readonly ChimeNote[] = [
  { hz: 880, at: 0, length: 0.12, peak: 0.06 },
  { hz: 1320, at: 0.1, length: 0.14, peak: 0.05 },
];

/** The soft start of each note (seconds): no click. */
export const CHIME_ATTACK = 0.012;
/** The notes are scheduled this far ahead (seconds), so no ramp starts in the past. */
const LEAD = 0.01;
/** Where the release ends: an exponential ramp cannot reach 0, and this is -80 dB, silent. */
const SILENT = 0.0001;

/** The part of an AudioContext the chime uses (a fake in tests). */
export type ChimeContext = Pick<
  AudioContext,
  'state' | 'currentTime' | 'destination' | 'createOscillator' | 'createGain' | 'resume'
>;

export interface ChimeEnv {
  /** A new AudioContext, or null where the browser has none. */
  createContext(): ChimeContext | null;
  /** True when the page already had a user gesture (the browser then lets audio start without a new one). */
  hadGesture(): boolean;
  /** Calls `listener` on each pointer or key press anywhere in the page (passive); returns the function that stops it. */
  onGesture(listener: () => void): () => void;
  /** False while the staff member turned the sound off. */
  enabled(): boolean;
}

export interface Chime {
  /** Waits for the gesture that unlocks the sound. Calling it again changes nothing. */
  arm(): void;
  /** Plays the chime now when the sound is on and unlocked, else nothing. True when it played. */
  play(): boolean;
}

export function createChime(env: ChimeEnv): Chime {
  let context: ChimeContext | null = null;
  let stopGestures: (() => void) | undefined;

  function disarm() {
    stopGestures?.();
    stopGestures = undefined;
  }

  /** Creates the page's one context, or resumes it; the listeners go once it runs. */
  function unlock() {
    try {
      context ??= env.createContext();
    } catch {
      // No context now (a blocked API, too many contexts): the next gesture tries again.
      return;
    }
    if (context === null) return;
    if (context.state === 'running') {
      disarm();
      return;
    }
    context.resume().then(
      () => {
        if (context?.state === 'running') disarm();
      },
      () => {},
    );
  }

  function arm() {
    if (stopGestures !== undefined || context?.state === 'running') return;
    stopGestures = env.onGesture(unlock);
    // A gesture before the bell existed (the sign-in) already counts.
    if (env.hadGesture()) unlock();
  }

  return {
    arm,
    play() {
      if (!env.enabled()) return false;
      if (context?.state !== 'running') {
        // Not unlocked yet, or the browser suspended it meanwhile: the next gesture unlocks it; this ring stays silent.
        arm();
        return false;
      }
      try {
        const start = context.currentTime + LEAD;
        for (const note of CHIME_NOTES) {
          const at = start + note.at;
          const end = at + note.length;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(note.hz, at);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(note.peak, at + CHIME_ATTACK);
          gain.gain.exponentialRampToValueAtTime(SILENT, end);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(at);
          oscillator.stop(end);
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}

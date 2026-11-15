// The console's alert sound for a new customer message (feature 28, rule 5): two short tones from the Web Audio API, so there is no sound file to load. Browsers
// refuse sound before the user has used the page, so nothing plays until the first click or key press: that gesture creates (or resumes) the audio context, and
// `play()` stays silent while the context is not running. At most one sound plays in a short time, so a burst of messages is one beep.
import { sharedAudioContext } from '@/lib/sharedAudio';
import { SOUND_GAP_MS } from './liveTiming';

export interface AlertSound {
  /** Starts listening for the first user gesture. Answers the function that stops listening. */
  arm(): () => void;
  /** Plays the two tones. False when nothing played: no gesture yet, no Web Audio in this browser, or a beep a moment ago. */
  play(): boolean;
}

/** The events that count as the user having used the page (and that browsers accept to start audio). */
const GESTURES = ['pointerdown', 'keydown', 'click'] as const;

/** One tone: a sine with a soft attack and a fast fade, so it does not click. */
function tone(context: AudioContext, start: number, frequency: number, seconds: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.02);
}

export function createAlertSound(): AlertSound {
  let context: AudioContext | null = null;
  let lastPlayed = Number.NEGATIVE_INFINITY;

  // Runs inside a user gesture: this is the moment a browser lets an audio context start.
  function unlock(): void {
    try {
      // The page's one context, shared with the notification bell's chime (src/lib/sharedAudio.ts).
      context ??= sharedAudioContext();
      if (!context) return;
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch {
      // No audio device or a blocked context: the console simply stays silent.
    }
  }

  return {
    arm() {
      for (const gesture of GESTURES)
        window.addEventListener(gesture, unlock, { capture: true, passive: true });
      return () => {
        for (const gesture of GESTURES) window.removeEventListener(gesture, unlock, { capture: true });
      };
    },
    play() {
      if (!context || context.state !== 'running') return false;
      const now = Date.now();
      if (now - lastPlayed < SOUND_GAP_MS) return false;
      lastPlayed = now;
      try {
        const start = context.currentTime + 0.01;
        tone(context, start, 880, 0.14);
        tone(context, start + 0.16, 660, 0.18);
        return true;
      } catch {
        return false;
      }
    },
  };
}

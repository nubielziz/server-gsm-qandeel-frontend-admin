// Tests for the bell's arrival chime: two soft sine notes under 400 ms, nothing before a gesture unlocked the sound, one context, listening only until it
// runs, nothing while the sound is off, and no retry of its own when the browser suspended it.
import { describe, expect, it } from 'vitest';
import { FakeAudioContext } from '../test/fakeAudio';
import { CHIME_NOTES, createChime, type ChimeContext, type ChimeEnv } from './chime';

/** A fake page: its gestures, whether it already had one, the sound setting and what the browser allows. */
function fakePage(options: { audio?: boolean; hadGesture?: boolean } = {}) {
  const listeners = new Set<() => void>();
  const contexts: FakeAudioContext[] = [];
  let enabled = true;
  let allows = true;
  const env: ChimeEnv = {
    createContext() {
      if (options.audio === false) return null;
      const context = new FakeAudioContext();
      context.allows = allows;
      contexts.push(context);
      return context as unknown as ChimeContext;
    },
    hadGesture: () => options.hadGesture ?? false,
    onGesture(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    enabled: () => enabled,
  };
  return {
    env,
    contexts,
    listening: () => listeners.size,
    /** A pointer or key press; waits for `resume` to settle. */
    async gesture() {
      for (const listener of [...listeners]) listener();
      await Promise.resolve();
      await Promise.resolve();
    },
    mute(next: boolean) {
      enabled = !next;
    },
    /** The browser refuses to start audio (a press it does not count, such as a touch that has not lifted yet). */
    refuse(next: boolean) {
      allows = !next;
      for (const context of contexts) context.allows = !next;
    },
  };
}

describe('the chime', () => {
  it('plays two soft sine notes, about 880 Hz then 1320 Hz, under 400 ms, to the speakers', async () => {
    const page = fakePage();
    const chime = createChime(page.env);
    chime.arm();
    await page.gesture();
    expect(chime.play()).toBe(true);

    const [context] = page.contexts;
    expect(context.oscillators.map((oscillator) => oscillator.type)).toEqual(['sine', 'sine']);
    expect(context.notes()).toEqual([880, 1320]);
    for (const [index, gain] of context.gains.entries()) {
      expect(context.oscillators[index].target).toBe(gain);
      expect(gain.target).toBe(context.destination);
      const [start, attack, release] = gain.gain.events;
      // A gentle attack from silence to a quiet peak, then a release back to silence.
      expect(start).toMatchObject({ kind: 'set', value: 0 });
      expect(attack.kind).toBe('linear');
      expect(attack.value).toBeGreaterThanOrEqual(0.04);
      expect(attack.value).toBeLessThanOrEqual(0.08);
      expect(attack.time - start.time).toBeGreaterThan(0.005);
      expect(release.kind).toBe('exponential');
      expect(release.value).toBeLessThan(0.001);
    }
    const startsAt = Math.min(...context.oscillators.map((oscillator) => oscillator.startAt ?? Infinity));
    const endsAt = Math.max(...context.oscillators.map((oscillator) => oscillator.stopAt ?? 0));
    expect(startsAt).toBeGreaterThanOrEqual(context.currentTime);
    expect(endsAt - context.currentTime).toBeLessThan(0.4);
    expect(CHIME_NOTES).toHaveLength(2);
  });

  it('plays nothing before a gesture unlocked it: no context, no error', () => {
    const page = fakePage();
    const chime = createChime(page.env);
    chime.arm();
    expect(chime.play()).toBe(false);
    expect(page.contexts).toEqual([]);
  });

  it('creates one context on the first gesture and stops listening once it runs', async () => {
    const page = fakePage();
    const chime = createChime(page.env);
    chime.arm();
    chime.arm();
    expect(page.listening()).toBe(1);
    await page.gesture();
    expect(page.contexts).toHaveLength(1);
    expect(page.contexts[0].resumes).toBe(1);
    expect(page.listening()).toBe(0);
    await page.gesture();
    expect(page.contexts).toHaveLength(1);
    chime.arm();
    expect(page.listening()).toBe(0);
  });

  it('keeps listening while the browser refuses to start it, and plays nothing meanwhile', async () => {
    const page = fakePage();
    const chime = createChime(page.env);
    chime.arm();
    page.refuse(true);
    await page.gesture();
    expect(page.contexts[0].state).toBe('suspended');
    expect(page.listening()).toBe(1);
    expect(chime.play()).toBe(false);
    expect(page.contexts[0].oscillators).toEqual([]);

    page.refuse(false);
    await page.gesture();
    expect(page.contexts).toHaveLength(1);
    expect(page.listening()).toBe(0);
    expect(chime.play()).toBe(true);
  });

  it('unlocks at once when the page already had a gesture (the sign-in)', async () => {
    const page = fakePage({ hadGesture: true });
    const chime = createChime(page.env);
    chime.arm();
    await Promise.resolve();
    expect(page.contexts).toHaveLength(1);
    expect(page.listening()).toBe(0);
    expect(chime.play()).toBe(true);
  });

  it('plays nothing while the sound is off, and again once it is on', async () => {
    const page = fakePage();
    const chime = createChime(page.env);
    chime.arm();
    await page.gesture();
    page.mute(true);
    expect(chime.play()).toBe(false);
    expect(page.contexts[0].oscillators).toEqual([]);
    page.mute(false);
    expect(chime.play()).toBe(true);
  });

  it('plays nothing where the browser has no Web Audio', async () => {
    const page = fakePage({ audio: false });
    const chime = createChime(page.env);
    chime.arm();
    await page.gesture();
    expect(chime.play()).toBe(false);
  });

  it('waits for a new gesture when the browser suspended it meanwhile, without a retry of its own', async () => {
    const page = fakePage();
    const chime = createChime(page.env);
    chime.arm();
    await page.gesture();
    page.contexts[0].state = 'suspended';
    expect(chime.play()).toBe(false);
    expect(page.contexts[0].resumes).toBe(1);
    expect(page.listening()).toBe(1);
    await page.gesture();
    expect(page.contexts[0].resumes).toBe(2);
    expect(chime.play()).toBe(true);
  });
});

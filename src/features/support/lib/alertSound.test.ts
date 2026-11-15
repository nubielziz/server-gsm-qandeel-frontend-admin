// Tests for the alert sound: nothing plays before the first user gesture, the first gesture starts the audio, a burst is one beep, and a browser without Web Audio stays silent.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSharedAudioContext } from '@/lib/sharedAudio';
import { createAlertSound } from './alertSound';
import { SOUND_GAP_MS } from './liveTiming';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

const made: FakeContext[] = [];
class FakeContext {
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  destination = {};
  tones = 0;
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  constructor() {
    made.push(this);
  }
  createOscillator() {
    this.tones += 1;
    return { type: '', frequency: new FakeParam(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  }
  createGain() {
    return { gain: new FakeParam(), connect: vi.fn() };
  }
}

let now = 1_000_000;
beforeEach(() => {
  resetSharedAudioContext();
  made.length = 0;
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.stubGlobal('AudioContext', FakeContext);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const gesture = (type = 'pointerdown') => window.dispatchEvent(new Event(type));

describe('createAlertSound', () => {
  it('is silent until the page has been used', () => {
    const sound = createAlertSound();
    const disarm = sound.arm();
    expect(sound.play()).toBe(false);
    expect(made).toHaveLength(0);
    disarm();
  });

  it('starts the audio on the first click, key press or pointer press, and then plays two tones', () => {
    const sound = createAlertSound();
    const disarm = sound.arm();
    gesture('keydown');
    expect(made).toHaveLength(1);
    expect(made[0].resume).toHaveBeenCalledTimes(1);
    expect(sound.play()).toBe(true);
    expect(made[0].tones).toBe(2);
    gesture('click');
    expect(made).toHaveLength(1);
    disarm();
  });

  it('plays one beep for a burst, and again after the gap', () => {
    const sound = createAlertSound();
    const disarm = sound.arm();
    gesture();
    expect(sound.play()).toBe(true);
    now += SOUND_GAP_MS - 1;
    expect(sound.play()).toBe(false);
    now += 2;
    expect(sound.play()).toBe(true);
    expect(made[0].tones).toBe(4);
    disarm();
  });

  it('stays silent while the browser keeps the audio suspended', () => {
    class Stuck extends FakeContext {
      resume = vi.fn(() => Promise.resolve());
    }
    vi.stubGlobal('AudioContext', Stuck);
    const sound = createAlertSound();
    const disarm = sound.arm();
    gesture();
    expect(sound.play()).toBe(false);
    disarm();
  });

  it('stops listening for gestures when disarmed', () => {
    const sound = createAlertSound();
    sound.arm()();
    gesture();
    expect(made).toHaveLength(0);
    expect(sound.play()).toBe(false);
  });

  it('does not throw without Web Audio, or when the audio device is refused', () => {
    vi.stubGlobal('AudioContext', undefined);
    const quiet = createAlertSound();
    const disarm = quiet.arm();
    expect(() => gesture()).not.toThrow();
    expect(quiet.play()).toBe(false);
    disarm();

    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('no device');
        }
      },
    );
    const refused = createAlertSound();
    const disarmRefused = refused.arm();
    expect(() => gesture()).not.toThrow();
    expect(refused.play()).toBe(false);
    disarmRefused();
  });
});

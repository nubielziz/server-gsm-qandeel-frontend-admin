// Tests for the bell's arrival animation rules: only live items in a visible tab ring, at most once every 3 s, a hidden tab rings once on return, a read
// rolls the number down, reduced motion plays nothing, and what the bell plays for each cue (never on mount, pop in from nothing, no roll from 99+ to 99+).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBellMotion,
  IDLE_MOTION,
  initialBellView,
  nextBellView,
  RING_WINDOW_MS,
  settleBellView,
  type BellMotionEnv,
  type BellMotionSnapshot,
} from './bellMotion';

/** A fake browser: a visibility switch and a reduced-motion switch the test scripts; time is Vitest's fake clock. */
function fakeEnv(options: { visible?: boolean; reduced?: boolean } = {}) {
  let visible = options.visible ?? true;
  const reduced = options.reduced ?? false;
  const listeners = new Set<() => void>();
  const env: BellMotionEnv = {
    now: () => Date.now(),
    isVisible: () => visible,
    reducedMotion: () => reduced,
    onVisibilityChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    env,
    visibilityListeners: () => listeners.size,
    setVisible(next: boolean) {
      visible = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('when the bell rings', () => {
  it('rings and pops for a live item in a visible tab, and never for a replayed one', () => {
    const motion = createBellMotion(fakeEnv().env);
    motion.arrival(3, false);
    expect(motion.getSnapshot()).toBe(IDLE_MOTION);
    motion.arrival(4, true);
    expect(motion.getSnapshot()).toEqual({ rings: 1, change: { seq: 1, to: 4, pop: true } });
  });

  it('rings at most once every 3 s; the number still rolls for every item', () => {
    const motion = createBellMotion(fakeEnv().env);
    motion.arrival(1, true);
    vi.advanceTimersByTime(1_000);
    motion.arrival(2, true);
    vi.advanceTimersByTime(RING_WINDOW_MS - 1_001);
    motion.arrival(3, true);
    expect(motion.getSnapshot()).toEqual({ rings: 1, change: { seq: 3, to: 3, pop: false } });
    vi.advanceTimersByTime(1);
    motion.arrival(4, true);
    expect(motion.getSnapshot()).toEqual({ rings: 2, change: { seq: 4, to: 4, pop: true } });
  });

  it('leaves no timer behind', () => {
    const motion = createBellMotion(fakeEnv().env);
    const stop = motion.subscribe(() => {});
    motion.arrival(1, true);
    motion.read(0);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('plays nothing with reduced motion: the number just changes', () => {
    const browser = fakeEnv({ reduced: true });
    const motion = createBellMotion(browser.env);
    motion.subscribe(() => {});
    motion.arrival(1, true);
    motion.read(0);
    expect(motion.getSnapshot()).toBe(IDLE_MOTION);
    browser.setVisible(false);
    motion.arrival(1, true);
    browser.setVisible(true);
    expect(motion.getSnapshot()).toBe(IDLE_MOTION);
  });

  it('rolls the number down for a read and never rings for it', () => {
    const motion = createBellMotion(fakeEnv().env);
    motion.read(2);
    expect(motion.getSnapshot()).toEqual({ rings: 0, change: { seq: 1, to: 2, pop: false } });
  });

  it("caps the number at the server's 100 (shown as 99+)", () => {
    const motion = createBellMotion(fakeEnv().env);
    motion.arrival(250, true);
    expect(motion.getSnapshot().change?.to).toBe(100);
  });
});

describe('a hidden tab', () => {
  it('does not ring while hidden, and rings once when the staff member comes back', () => {
    const browser = fakeEnv({ visible: false });
    const motion = createBellMotion(browser.env);
    motion.subscribe(() => {});
    motion.arrival(1, true);
    motion.arrival(2, true);
    expect(motion.getSnapshot()).toBe(IDLE_MOTION);
    browser.setVisible(true);
    expect(motion.getSnapshot()).toEqual({ rings: 1, change: null });
    browser.setVisible(false);
    browser.setVisible(true);
    expect(motion.getSnapshot().rings).toBe(1);
  });

  it('does not ring on return when only replays came, or when everything was read meanwhile', () => {
    const browser = fakeEnv({ visible: false });
    const motion = createBellMotion(browser.env);
    motion.subscribe(() => {});
    motion.arrival(1, false);
    browser.setVisible(true);
    expect(motion.getSnapshot()).toBe(IDLE_MOTION);
    browser.setVisible(false);
    motion.arrival(1, true);
    motion.read(0);
    browser.setVisible(true);
    expect(motion.getSnapshot()).toBe(IDLE_MOTION);
  });

  it('watches the visibility only while a bell listens', () => {
    const browser = fakeEnv();
    const motion = createBellMotion(browser.env);
    const stopOne = motion.subscribe(() => {});
    const stopTwo = motion.subscribe(() => {});
    expect(browser.visibilityListeners()).toBe(1);
    stopOne();
    stopTwo();
    expect(browser.visibilityListeners()).toBe(0);
  });
});

describe('what the bell plays', () => {
  const cue = (rings: number, seq: number, to: number, pop: boolean): BellMotionSnapshot => ({
    rings,
    change: { seq, to, pop },
  });

  it('plays nothing on mount, even for cues that came before it', () => {
    const view = initialBellView(3, '3', cue(4, 9, 3, true));
    expect(view).toMatchObject({ ring: false, pop: null, roll: null });
    expect(nextBellView(view, 3, '3', cue(4, 9, 3, true))).toBe(view);
  });

  it('just changes the number for a change no cue explains (a poll, a resync)', () => {
    const view = initialBellView(3, '3', IDLE_MOTION);
    expect(nextBellView(view, 5, '5', IDLE_MOTION)).toMatchObject({
      count: 5,
      ring: false,
      pop: null,
      roll: null,
    });
  });

  it('swings, pops and rolls the number up for a live item', () => {
    const view = initialBellView(3, '3', IDLE_MOTION);
    expect(nextBellView(view, 4, '4', cue(1, 1, 4, true))).toMatchObject({
      ring: true,
      pop: 'pop',
      roll: { from: '3', up: true },
    });
  });

  it('pops the badge in from nothing for the first unread', () => {
    const view = initialBellView(0, '', IDLE_MOTION);
    expect(nextBellView(view, 1, '1', cue(1, 1, 1, true))).toMatchObject({ pop: 'in', roll: null });
  });

  it('rolls the number down for a read, without a swing or a pop', () => {
    const view = initialBellView(3, '3', IDLE_MOTION);
    expect(nextBellView(view, 2, '2', cue(0, 1, 2, false))).toMatchObject({
      ring: false,
      pop: null,
      roll: { from: '3', up: false },
    });
  });

  it("rolls a read action's cue at the first lower number, whichever lands first, and drops it on a rise", () => {
    const motion = createBellMotion(fakeEnv().env);
    motion.read(null);
    const action = motion.getSnapshot();
    expect(action.change).toEqual({ seq: 1, to: null, pop: false });
    const view = initialBellView(3, '3', IDLE_MOTION);
    expect(nextBellView(view, 3, '3', action)).toBe(view);
    expect(nextBellView(view, 2, '2', action)).toMatchObject({
      count: 2,
      seq: 1,
      roll: { from: '3', up: false },
    });
    expect(nextBellView(view, 4, '4', action)).toMatchObject({ count: 4, seq: 1, roll: null });
  });

  it('does not roll 99+ into 99+', () => {
    const view = initialBellView(100, '99+', IDLE_MOTION);
    expect(nextBellView(view, 100, '99+', cue(1, 1, 100, true))).toMatchObject({
      ring: true,
      pop: 'pop',
      roll: null,
    });
  });

  it("waits for the cue's number when the cue lands first, and drops a cue another number overtook", () => {
    const view = initialBellView(3, '3', IDLE_MOTION);
    const early = nextBellView(view, 3, '3', cue(0, 1, 4, false));
    expect(early).toBe(view);
    expect(nextBellView(early, 4, '4', cue(0, 1, 4, false))).toMatchObject({ roll: { from: '3', up: true } });
    const overtaken = nextBellView(view, 7, '7', cue(0, 1, 4, false));
    expect(overtaken).toMatchObject({ count: 7, seq: 1, roll: null });
    expect(nextBellView(overtaken, 4, '4', cue(0, 1, 4, false)).roll).toBeNull();
  });

  it('sets each part at rest when its animation ends', () => {
    let view = nextBellView(initialBellView(3, '3', IDLE_MOTION), 4, '4', cue(1, 1, 4, true));
    view = settleBellView(view, 'bell-ring');
    expect(view).toMatchObject({ ring: false, pop: 'pop' });
    view = settleBellView(settleBellView(view, 'badge-pop'), 'count-out-up');
    expect(view).toMatchObject({ ring: false, pop: null, roll: null });
    expect(settleBellView(view, 'count-in-up')).toBe(view);
  });
});

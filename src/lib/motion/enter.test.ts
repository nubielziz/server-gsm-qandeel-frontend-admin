// Tests for playEnter: what it plays, and every case where it plays nothing (no element, no animate function, reduced motion).
import { afterEach, describe, expect, it } from 'vitest';
import { playEnter, prefersReducedMotion } from './enter';
import { installAnimate, setReducedMotion } from './testing/layout';

let restore: Array<() => void> = [];
afterEach(() => {
  for (const undo of restore) undo();
  restore = [];
});

function fake() {
  const stub = installAnimate();
  restore.push(stub.restore);
  return stub;
}

describe('playEnter', () => {
  it('fades the element in from the offset to its place, with no fill, for 200 ms', () => {
    const { animate } = fake();
    const el = document.createElement('div');
    playEnter(el, { x: 8, y: 0 });
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(frames).toEqual([
      { opacity: 0, transform: 'translate(8px, 0px)' },
      { opacity: 1, transform: 'none' },
    ]);
    expect(options.duration).toBe(200);
    expect(options.fill).toBeUndefined();
    expect(options.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('takes a duration', () => {
    const { animate } = fake();
    playEnter(document.createElement('div'), { y: 6, duration: 120 });
    expect((animate.mock.calls[0] as unknown as [unknown, KeyframeAnimationOptions])[1].duration).toBe(120);
  });

  it('does nothing without an element', () => {
    const { animate } = fake();
    playEnter(null);
    playEnter(undefined);
    expect(animate).not.toHaveBeenCalled();
  });

  it('does nothing when the element has no animate function (jsdom)', () => {
    const el = document.createElement('div');
    expect(typeof el.animate).not.toBe('function');
    expect(() => playEnter(el, { y: 6 })).not.toThrow();
  });

  it('does nothing with reduced motion', () => {
    const { animate } = fake();
    restore.push(setReducedMotion(true));
    expect(prefersReducedMotion()).toBe(true);
    playEnter(document.createElement('div'), { y: 6 });
    expect(animate).not.toHaveBeenCalled();
  });

  it('stops the enter still running on the same element when a new one starts', () => {
    const { animate, animations } = fake();
    const el = document.createElement('div');
    const other = document.createElement('div');
    playEnter(el, { y: 6 });
    playEnter(other, { y: 6 });
    expect(animations[0].cancel).not.toHaveBeenCalled();
    playEnter(el, { y: 6 });
    expect(animate).toHaveBeenCalledTimes(3);
    expect(animations[0].cancel).toHaveBeenCalledTimes(1);
    expect(animations[1].cancel).not.toHaveBeenCalled();
  });

  it('does not stop an enter that has finished', () => {
    const { animations } = fake();
    const el = document.createElement('div');
    playEnter(el, { y: 6 });
    animations[0].onfinish?.();
    playEnter(el, { y: 6 });
    expect(animations[0].cancel).not.toHaveBeenCalled();
  });
});

describe('prefersReducedMotion', () => {
  it('is false when the visitor did not ask for it', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});

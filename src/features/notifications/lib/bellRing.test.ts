// Tests for the bell's swing: CSS times are read with their unit (the built CSS writes 600ms as .6s), and the swing is played on the element it is given.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cssTimeMs, playRing, RING_FRAMES } from './bellRing';

describe('cssTimeMs', () => {
  it('reads milliseconds and seconds (the built CSS writes 600ms as .6s)', () => {
    expect(cssTimeMs('600ms', 1)).toBe(600);
    expect(cssTimeMs('.6s', 1)).toBe(600);
    expect(cssTimeMs('0.6s', 1)).toBe(600);
    expect(cssTimeMs(' 1.2s ', 1)).toBe(1200);
    expect(cssTimeMs('', 600)).toBe(600);
    expect(cssTimeMs('fast', 600)).toBe(600);
  });
});

describe('playRing', () => {
  afterEach(() => vi.restoreAllMocks());

  it('swings the element itself and settles when the swing finishes; a stopped swing does not settle', () => {
    const animation = { onfinish: null as null | (() => void), cancel: vi.fn() };
    const el = document.createElement('span');
    const animate = vi.fn(() => animation as unknown as Animation);
    el.animate = animate;
    const done = vi.fn();
    const stop = playRing(el, done);
    expect(animate).toHaveBeenCalledWith(RING_FRAMES, expect.objectContaining({ duration: 600 }));
    animation.onfinish?.();
    expect(done).toHaveBeenCalledTimes(1);

    const again = playRing(el, done);
    again();
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    expect(animation.onfinish).toBeNull();
    expect(done).toHaveBeenCalledTimes(1);
    stop();
  });

  it('settles at once where it cannot play (no Web Animations API, as in jsdom)', () => {
    const done = vi.fn();
    playRing(document.createElement('span'), done);
    expect(done).toHaveBeenCalledTimes(1);
  });
});

// Tests for floatingPosition: where menus and notes land relative to their trigger.
import { describe, expect, it } from 'vitest';
import { floatingPosition } from './floating';

const viewport = { width: 1000, height: 700 };
const size = { width: 200, height: 120 };

describe('floatingPosition', () => {
  const anchor = { left: 400, right: 440, top: 100, bottom: 132 };

  it('opens 4px under the anchor, aligned to its end edge by default', () => {
    expect(floatingPosition(anchor, size, viewport)).toEqual({ left: 240, top: 136 });
  });

  it('aligns to the start edge when asked', () => {
    expect(floatingPosition(anchor, size, viewport, 'start')).toEqual({ left: 400, top: 136 });
  });

  it('stays 8px inside the viewport on both sides', () => {
    expect(floatingPosition({ ...anchor, left: 2, right: 30 }, size, viewport, 'end').left).toBe(8);
    expect(floatingPosition({ ...anchor, left: 990, right: 998 }, size, viewport, 'start').left).toBe(792);
  });

  it('flips above the anchor when there is no room below', () => {
    const low = { left: 400, right: 440, top: 640, bottom: 672 };
    expect(floatingPosition(low, size, viewport).top).toBe(516);
  });

  it('never goes above the top margin', () => {
    const tall = { width: 200, height: 900 };
    expect(floatingPosition(anchor, tall, viewport).top).toBe(8);
  });
});

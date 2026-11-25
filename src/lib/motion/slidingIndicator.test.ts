// Tests for the sliding mark: the pure rules (stay, jump, slide, hide) and the DOM work (first placement, a change of the selected item,
// a resize, hidden items, a browser without ResizeObserver), with boxes and a resize observer made by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachIndicator, boxWithin, nextMove, sameBox, TAB_INDICATOR, type Box } from './slidingIndicator';
import { FakeResizeObserver, installLayout } from './testing/layout';

const box = (x: number, w = 80): Box => ({ x, y: 0, w, h: 36 });

describe('sameBox', () => {
  it('ignores differences under half a pixel', () => {
    expect(sameBox(box(10), { ...box(10), x: 10.4 })).toBe(true);
    expect(sameBox(box(10), box(11))).toBe(false);
    expect(sameBox(box(10), box(10, 81))).toBe(false);
  });
});

describe('nextMove', () => {
  const a = { el: 'a', box: box(0) };
  const b = { el: 'b', box: box(90) };

  it('jumps for the first placement and hides when nothing is selected any more', () => {
    expect(nextMove(null, a, true)).toBe('jump');
    expect(nextMove(null, null, true)).toBe('stay');
    expect(nextMove(a, null, true)).toBe('hide');
  });

  it('slides only for another selected item after a change in the page', () => {
    expect(nextMove(a, b, true)).toBe('slide');
    expect(nextMove(a, b, false)).toBe('jump');
  });

  it('jumps when the same item only moved or grew, and stays when it did not', () => {
    expect(nextMove(a, { el: 'a', box: box(20) }, true)).toBe('jump');
    expect(nextMove(a, { el: 'a', box: box(0, 100) }, false)).toBe('jump');
    expect(nextMove(a, { el: 'a', box: box(0.2) }, true)).toBe('stay');
  });
});

describe('boxWithin', () => {
  let undo = () => {};
  afterEach(() => undo());

  it('reads the box of an item in the container, to the fraction of a pixel', () => {
    const container = document.createElement('div');
    const item = document.createElement('button');
    container.append(item);
    undo = installLayout(container, new Map([[item, { x: 12.5, y: 3, w: 70.25, h: 36 }]]));
    expect(boxWithin(container, item)).toEqual({ x: 12.5, y: 3, w: 70.25, h: 36 });
  });

  it("measures from the container's padding box and adds how far the container is scrolled", () => {
    const container = document.createElement('div');
    const item = document.createElement('button');
    container.append(item);
    // The item is 12.5 px from the padding box; with a 1 px border and the strip scrolled 30 px the rectangles say so.
    undo = installLayout(container, new Map([[item, { x: 12.5, y: 3, w: 70, h: 36 }]]), {
      origin: { x: 40, y: 10 },
      border: 1,
      scroll: { x: 30, y: 0 },
    });
    expect(boxWithin(container, item)).toEqual({ x: 12.5, y: 3, w: 70, h: 36 });
  });

  it('is null for an item with no size (hidden)', () => {
    const container = document.createElement('div');
    const item = document.createElement('button');
    container.append(item);
    expect(boxWithin(container, item)).toBeNull();
    undo = installLayout(container, new Map());
    expect(boxWithin(container, item)).toBeNull();
  });
});

describe('attachIndicator', () => {
  let container: HTMLElement;
  let mark: HTMLElement;
  let first: HTMLElement;
  let second: HTMLElement;
  let boxes: Map<Element, Box>;
  let undo = () => {};
  let writes: Array<[string, string | null]>;

  function tab(label: string, selected: boolean) {
    const el = document.createElement('button');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', String(selected));
    el.textContent = label;
    return el;
  }
  const lastWrite = (name: string) => writes.filter(([key]) => key === name).at(-1)?.[1];
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    container = document.createElement('div');
    mark = document.createElement('span');
    mark.setAttribute('data-slide-mark', '');
    first = tab('A', true);
    second = tab('B', false);
    container.append(mark, first, second);
    document.body.append(container);
    boxes = new Map([
      [first, box(0)],
      [second, box(90)],
    ]);
    undo = installLayout(container, boxes);
    FakeResizeObserver.install();
    writes = [];
    const setProperty = mark.style.setProperty.bind(mark.style);
    vi.spyOn(mark.style, 'setProperty').mockImplementation((name, value) => {
      writes.push([name, value]);
      setProperty(name, value);
    });
    vi.spyOn(mark.style, 'removeProperty').mockImplementation((name) => {
      writes.push([name, null]);
      return '';
    });
  });
  afterEach(() => {
    undo();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    container.remove();
  });

  it('places the mark on the selected item without a transition and sets data-indicator', () => {
    attachIndicator(container, TAB_INDICATOR);
    expect(container).toHaveAttribute('data-indicator');
    expect(lastWrite('width')).toBe('80px');
    expect(lastWrite('height')).toBe('36px');
    expect(lastWrite('translate')).toBe('0px 0px');
    // The transition is off for the write and back afterwards.
    const names = writes.map(([name, value]) => `${name}:${value}`);
    expect(names.indexOf('transition:none')).toBeGreaterThan(-1);
    expect(names.indexOf('transition:null')).toBeGreaterThan(names.indexOf('transition:none'));
  });

  it('slides to the item that becomes selected (the transition stays on)', async () => {
    attachIndicator(container, TAB_INDICATOR);
    writes.length = 0;
    first.setAttribute('aria-selected', 'false');
    second.setAttribute('aria-selected', 'true');
    await settle();
    expect(lastWrite('translate')).toBe('90px 0px');
    expect(writes.map(([name]) => name)).not.toContain('transition');
  });

  it('jumps on a resize, with the transition off', () => {
    attachIndicator(container, TAB_INDICATOR);
    writes.length = 0;
    boxes.set(first, box(0, 120));
    FakeResizeObserver.fire();
    expect(lastWrite('width')).toBe('120px');
    expect(writes.map(([name, value]) => `${name}:${value}`)).toContain('transition:none');
  });

  it('does nothing when the box did not change', () => {
    attachIndicator(container, TAB_INDICATOR);
    writes.length = 0;
    FakeResizeObserver.fire();
    expect(writes).toEqual([]);
  });

  it('is not placed while the selected item is hidden, and is placed when it shows', () => {
    boxes.clear();
    attachIndicator(container, TAB_INDICATOR);
    expect(container).not.toHaveAttribute('data-indicator');
    boxes.set(first, box(0));
    FakeResizeObserver.fire();
    expect(container).toHaveAttribute('data-indicator');
  });

  it('hides the mark when nothing is selected', async () => {
    attachIndicator(container, TAB_INDICATOR);
    first.setAttribute('aria-selected', 'false');
    await settle();
    expect(lastWrite('opacity')).toBe('0');
  });

  it('does nothing without a ResizeObserver (the item keeps drawing its own look)', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const stop = attachIndicator(container, TAB_INDICATOR);
    expect(container).not.toHaveAttribute('data-indicator');
    expect(writes).toEqual([]);
    expect(() => stop()).not.toThrow();
  });

  it('does nothing without a mark element', () => {
    mark.remove();
    attachIndicator(container, TAB_INDICATOR);
    expect(container).not.toHaveAttribute('data-indicator');
  });

  it('removes data-indicator and stops watching when stopped', async () => {
    const stop = attachIndicator(container, TAB_INDICATOR);
    stop();
    expect(container).not.toHaveAttribute('data-indicator');
    writes.length = 0;
    first.setAttribute('aria-selected', 'false');
    second.setAttribute('aria-selected', 'true');
    await settle();
    expect(writes).toEqual([]);
  });
});

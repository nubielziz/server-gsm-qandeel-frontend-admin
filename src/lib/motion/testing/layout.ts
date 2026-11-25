// Test helpers for the motion kit: jsdom has no layout and no ResizeObserver, so these give elements rectangles and give the test a resize observer to drive by hand.
import { vi } from 'vitest';
import type { Box } from '../slidingIndicator';

/** A ResizeObserver that never fires by itself: the test calls `FakeResizeObserver.fire()`. */
export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;
  observed = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  /** Tells every observer that something changed size. */
  static fire() {
    for (const observer of FakeResizeObserver.instances)
      observer.callback([], observer as unknown as ResizeObserver);
  }
  /** Installs it as the global ResizeObserver; `vi.unstubAllGlobals()` removes it. */
  static install() {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  }
}

const GETTERS = ['clientLeft', 'clientTop', 'scrollLeft', 'scrollTop'] as const;

/** Where the container sits in the window, how thick its border is and how far it is scrolled. */
export interface LayoutOptions {
  origin?: { x: number; y: number };
  border?: number;
  scroll?: { x: number; y: number };
}

/**
 * Gives the elements in `boxes` their rectangles (`x` and `y` are measured from the container's padding box, the way the mark is placed, so
 * the rectangle is moved by the container's origin and border and back by its scroll); every other element has none. Returns the function
 * that puts jsdom's own methods back.
 */
export function installLayout(
  container: HTMLElement,
  boxes: Map<Element, Box>,
  { origin = { x: 100, y: 50 }, border = 0, scroll = { x: 0, y: 0 } }: LayoutOptions = {},
): () => void {
  const proto = Element.prototype;
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;
  const savedRect = Object.getOwnPropertyDescriptor(proto, 'getBoundingClientRect');
  const saved = GETTERS.map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)] as const);
  Object.defineProperty(proto, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value(this: Element) {
      if (this === container) return rect(origin.x, origin.y, 500, 40);
      const box = boxes.get(this);
      if (!box) return rect(0, 0, 0, 0);
      return rect(origin.x + border + box.x - scroll.x, origin.y + border + box.y - scroll.y, box.w, box.h);
    },
  });
  const define = (name: (typeof GETTERS)[number], own: number) =>
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: Element) {
        return this === container ? own : 0;
      },
    });
  define('clientLeft', border);
  define('clientTop', border);
  define('scrollLeft', scroll.x);
  define('scrollTop', scroll.y);
  return () => {
    if (savedRect) Object.defineProperty(proto, 'getBoundingClientRect', savedRect);
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else Reflect.deleteProperty(proto, name);
    }
  };
}

/** Makes `window.matchMedia` answer that the visitor asked for reduced motion (or not); returns the function that puts the old one back. */
export function setReducedMotion(reduced: boolean): () => void {
  const before = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = before;
  };
}

/** A stand-in for `Element.animate` that records its calls; `restore()` removes it. Each call returns a fake animation with `cancel`. */
export function installAnimate() {
  const proto = Element.prototype as { animate?: unknown };
  const before = proto.animate;
  const animations: {
    cancel: ReturnType<typeof vi.fn>;
    onfinish: null | (() => void);
    oncancel: null | (() => void);
  }[] = [];
  const animate = vi.fn(() => {
    const animation = { cancel: vi.fn(), onfinish: null, oncancel: null };
    animations.push(animation);
    return animation;
  });
  proto.animate = animate;
  return {
    animate,
    animations,
    restore() {
      if (before === undefined) Reflect.deleteProperty(proto, 'animate');
      else proto.animate = before;
    },
  };
}

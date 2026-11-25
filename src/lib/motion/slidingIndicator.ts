// A mark that slides under (or behind) the selected item of a row of tabs or links, instead of the item drawing its own selected look.
// The geometry and the decision are pure (and tested); attachIndicator does the DOM work. Ported from the idea of the storefront's
// SlidingNav (components/layout/sliding-nav.tsx), measured with bounding rectangles (to the fraction of a pixel) relative to the container.

/** A box in px, from the top left of the container's padding box. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the mark does next: nothing, jump (no transition), slide (the CSS transition) or hide (nothing is selected). */
export type Move = 'stay' | 'jump' | 'slide' | 'hide';

/** True when two boxes differ by less than half a pixel on every side: sub-pixel layout noise is no move. */
export function sameBox(a: Box, b: Box): boolean {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.w - b.w) < 0.5 &&
    Math.abs(a.h - b.h) < 0.5
  );
}

/**
 * The next move for the selected item `next` (null: nothing selected) after `last` (where the mark is now, null when it is not
 * shown). `changed` is true when the call comes from a change in the page (an attribute, an added item) and false for a resize.
 * Only a change of the selected item after such a change slides; the first placement, a resize and an item that only moved jump.
 */
export function nextMove<T>(
  last: { el: T; box: Box } | null,
  next: { el: T; box: Box } | null,
  changed: boolean,
): Move {
  if (!next) return last ? 'hide' : 'stay';
  if (!last) return 'jump';
  if (last.el === next.el && sameBox(last.box, next.box)) return 'stay';
  return changed && last.el !== next.el ? 'slide' : 'jump';
}

/**
 * The box of `el` inside `container`, to the fraction of a pixel, from their bounding rectangles: the offset of the two rectangles, less the
 * container's border (where its padding box starts), plus how far it is scrolled (the mark scrolls with the content). Null when `el` is
 * hidden (nothing to measure). A transform on a parent that only moves it (the page enter moves <main>) shifts both rectangles equally; a
 * scale would not, and nothing here scales.
 */
export function boxWithin(container: HTMLElement, el: HTMLElement): Box | null {
  const item = el.getBoundingClientRect();
  if (item.width === 0 && item.height === 0) return null;
  const outer = container.getBoundingClientRect();
  return {
    x: item.left - outer.left - container.clientLeft + container.scrollLeft,
    y: item.top - outer.top - container.clientTop + container.scrollTop,
    w: item.width,
    h: item.height,
  };
}

/** What to look for in a container: its items, the selected one and the attribute that marks it. */
export interface IndicatorSpec {
  /** The items (to watch their size). */
  item: string;
  /** The selected item. */
  selected: string;
  /** The attribute `selected` tests, so only a change of it is looked at. */
  attribute: string;
}

/** Tabs: `role="tab"` buttons, the selected one has `aria-selected="true"`. */
export const TAB_INDICATOR: IndicatorSpec = {
  item: '[role="tab"]',
  selected: '[aria-selected="true"]',
  attribute: 'aria-selected',
};

/** Links to pages: the current one has `aria-current="page"` (React Router's NavLink and the kit's strips set it). */
export const LINK_INDICATOR: IndicatorSpec = {
  item: 'a',
  selected: 'a[aria-current="page"]',
  attribute: 'aria-current',
};

/** The element of the container that is the mark: its direct child with `data-slide-mark` (see SlidingMark). */
function markOf(container: HTMLElement): HTMLElement | null {
  const child = Array.from(container.children).find((node) => node.hasAttribute('data-slide-mark'));
  return child instanceof HTMLElement ? child : null;
}

/**
 * Puts the mark of `container` on its selected item and keeps it there. The first placement and every resize jump (the transition is
 * switched off for that write); a change of the selected item slides (the CSS transition of .slide-mark). Once placed it sets
 * `data-indicator` on the container, and the CSS then stops drawing the item's own selected look, so before this runs, in a browser
 * without ResizeObserver and in tests the old look shows and nothing moves when the mark takes over. The container must be
 * positioned (the mark is absolutely positioned in it); the mark scrolls with it. Returns the function that stops everything.
 */
export function attachIndicator(container: HTMLElement, spec: IndicatorSpec): () => void {
  const mark = markOf(container);
  if (!mark || typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined')
    return () => {};

  let last: { el: HTMLElement; box: Box } | null = null;
  const draw = (box: Box) => {
    mark.style.setProperty('width', `${box.w}px`);
    mark.style.setProperty('height', `${box.h}px`);
    mark.style.setProperty('translate', `${box.x}px ${box.y}px`);
  };

  const place = (changed: boolean) => {
    const el = container.querySelector<HTMLElement>(spec.selected);
    const box = el ? boxWithin(container, el) : null;
    // Hidden (a closed dialog, a menu that is not shown): nothing to measure. The resize observer places the mark when it shows.
    if (el && !box) return;
    const next = el && box ? { el, box } : null;
    const move = nextMove(last, next, changed);
    if (move === 'stay') return;
    if (move === 'hide' || !next) {
      mark.style.setProperty('opacity', '0');
      last = null;
      return;
    }
    if (move === 'jump') {
      mark.style.setProperty('transition', 'none');
      draw(next.box);
      mark.style.removeProperty('opacity');
      container.setAttribute('data-indicator', '');
      void mark.offsetWidth; // apply the jump before the transition is back
      mark.style.removeProperty('transition');
    } else {
      // The style is live: a slide that starts in the middle of another one goes on from where the mark is.
      draw(next.box);
    }
    last = next;
  };

  const sizes = new ResizeObserver(() => place(false));
  const observeSizes = () => {
    sizes.disconnect();
    sizes.observe(container);
    for (const item of container.querySelectorAll(spec.item)) sizes.observe(item);
  };
  const changes = new MutationObserver(() => {
    observeSizes();
    place(true);
  });

  place(false);
  observeSizes();
  changes.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [spec.attribute],
  });
  return () => {
    changes.disconnect();
    sizes.disconnect();
    container.removeAttribute('data-indicator');
  };
}

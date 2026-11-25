// Hooks that play an enter on an element that is already on the page when a value changes (a tab, a page): they never remount
// anything, so what the content holds (state, scroll, focus) stays. Nothing plays on the first render.
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { playEnter, type EnterOptions } from './enter';
import { PAGE_RISE } from './tokens';
import { tabShift } from './tabDirection';

// Remembers the key that was last shown and the element it was shown in, and calls `play` when the key has changed under the same element
// and `ready` is true. An element that has just appeared (the first render, or a page that showed a skeleton first) is only recorded, so
// it never plays on its first sight. A change while `ready` is false is remembered by leaving the shown key as it was: the enter plays on the
// render where `ready` turns true, from the key shown last to the key now (two changes before that play once; a return to the shown key
// plays nothing). It runs after every commit and compares with the ref (not a "first run" flag), so Strict Mode's second run plays nothing.
function useChangedKey<E extends HTMLElement>(
  key: string,
  ready: boolean,
  play: (el: E, shownKey: string) => void,
): RefObject<E | null> {
  const ref = useRef<E>(null);
  const shown = useRef<{ key: string; el: E | null }>({ key, el: null });
  useLayoutEffect(() => {
    const before = shown.current;
    const el = ref.current;
    if (!el || before.el !== el) {
      shown.current = { key, el };
      return;
    }
    if (before.key === key || !ready) return;
    shown.current = { key, el };
    play(el, before.key);
  });
  return ref;
}

/**
 * Returns a ref for an element that already exists: when `key` changes, it fades in and rises by `offset` (a few px). Never on the
 * first render. The element is not remounted and nothing waits for the animation. With `ready` false (the new content is still
 * loading and the old content is still shown) the enter waits until `ready` is true.
 */
export function useEnterOnChange<E extends HTMLElement = HTMLElement>(
  key: string,
  offset: EnterOptions = { y: PAGE_RISE },
  ready = true,
): RefObject<E | null> {
  return useChangedKey<E>(key, ready, (el) => playEnter(el, offset));
}

/**
 * The same for the content under a tab strip. The content comes in from the side of the tab that was clicked: from the end side
 * when the new tab is further along `order` than the old one, from the start side when it is nearer the start. A value that
 * is not in `order` gives no sideways move, only the fade. Pass `ready: false` while a list keeps its previous rows and loads the new
 * tab's: the enter then plays when the new rows are there, in the direction from the tab shown last to the final one.
 */
export function useTabEnter<E extends HTMLElement = HTMLElement>(
  value: string,
  order: readonly string[],
  ready = true,
): RefObject<E | null> {
  return useChangedKey<E>(value, ready, (el, shown) => playEnter(el, { x: tabShift(shown, value, order) }));
}

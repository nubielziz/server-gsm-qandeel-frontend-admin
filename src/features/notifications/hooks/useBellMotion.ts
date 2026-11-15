// The bell's arrival animation, its sound and the hidden tab's title prefix, in the browser (owner, 2026-11-15). The rules are pure (lib/bellMotion.ts,
// lib/chime.ts, lib/titleBadge.ts); this file gives them the real clock, visibility, motion preference, Web Audio, the "Notification sound" setting and
// <title>, and the two hooks the bell uses.
import { useCallback, useEffect, useState, useSyncExternalStore, type AnimationEvent } from 'react';
import { readNotificationSound } from '@/app/layout/preferences';
import {
  createBellMotion,
  initialBellView,
  nextBellView,
  settleBellView,
  type BellMotionEnv,
  type BellView,
} from '../lib/bellMotion';
import { sharedAudioContext } from '@/lib/sharedAudio';
import { createChime } from '../lib/chime';
import { createTitleBadge } from '../lib/titleBadge';

function onVisibilityChange(listener: () => void): () => void {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

const isVisible = () => document.visibilityState === 'visible';

/** A touch counts as a gesture only when the finger lifts (`pointerup`); a mouse press on `pointerdown`. */
const GESTURES = ['pointerdown', 'pointerup', 'keydown'] as const;
const LISTEN = { capture: true, passive: true } as const;

/** The page's chime: the bell arms it, the bell's rules play it. */
export const notificationChime = createChime({
  createContext: sharedAudioContext,
  hadGesture: () => navigator.userActivation?.hasBeenActive === true,
  onGesture(listener) {
    for (const type of GESTURES) window.addEventListener(type, listener, LISTEN);
    return () => {
      for (const type of GESTURES) window.removeEventListener(type, listener, LISTEN);
    };
  },
  enabled: readNotificationSound,
});

const browserMotion: BellMotionEnv = {
  now: () => Date.now(),
  isVisible,
  reducedMotion: () =>
    typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  onVisibilityChange,
  chime: () => {
    notificationChime.play();
  },
};

/** The cues the live stream gives (useUnreadCount) and the bell plays: one per page, like the stream. */
export const bellMotion = createBellMotion(browserMotion);

/** The tab title's unread prefix, shared by every bell of the page. */
export const titleBadge = createTitleBadge({
  getTitle: () => document.title,
  setTitle(title) {
    document.title = title;
  },
  isVisible,
  onVisibilityChange,
  watchTitle(listener) {
    // The shell writes `document.title` (a new or rewritten <title> in the head). Watched only while a prefix is due, which means a hidden tab.
    const observer = new MutationObserver(listener);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  },
});

/**
 * What the bell plays for the number on screen. `onAnimationEnd` goes on the bell's button: the swing, the pop and the roll bubble up to it, and each
 * one that ends is set at rest (no timer).
 */
export function useBellMotion(
  count: number,
  text: string,
): {
  view: BellView;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  /** Sets one motion at rest by its name (the swing is played with the Web Animations API, which fires no animationend). */
  settle: (name: string) => void;
} {
  const motion = useSyncExternalStore(bellMotion.subscribe, bellMotion.getSnapshot);
  const [view, setView] = useState(() => initialBellView(count, text, motion));
  // The previous render's view is kept in state and moved on during render (React's "storing information from previous renders"): only when something
  // changed, so this never loops.
  const next = nextBellView(view, count, text, motion);
  if (next !== view) setView(next);
  const onAnimationEnd = useCallback((event: AnimationEvent<HTMLElement>) => {
    const name = event.animationName;
    setView((current) => settleBellView(current, name));
  }, []);
  const settle = useCallback((name: string) => setView((current) => settleBellView(current, name)), []);
  return { view: next, onAnimationEnd, settle };
}

/** Registers this bell's number for the hidden tab's title prefix; the registration ends with the bell. */
export function useTitleBadge(count: number, text: string): void {
  const [owner] = useState(() => ({}));
  useEffect(() => {
    titleBadge.set(owner, count, text);
  }, [owner, count, text]);
  useEffect(() => () => titleBadge.remove(owner), [owner]);
}

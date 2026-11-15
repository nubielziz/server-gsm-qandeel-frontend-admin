// The bell's arrival animation (owner, 2026-11-15; the website's bell follows the same rules): which stream events swing the icon, pop the badge and roll the
// number, and what the bell plays for each. Pure: time, visibility and the motion preference are passed in (hooks/useBellMotion.ts wires the browser).
import { UNREAD_CAP } from './inbox';

/** At most one ring in this window. */
export const RING_WINDOW_MS = 3_000;

/** A count change worth animating. The bell plays it only when it shows the count `to`. */
export interface BellChange {
  /** Grows with every cue. */
  seq: number;
  /** The unread count after the event (capped at the server's 100), or null for "the next number below the one on screen" (a read action). */
  to: number | null;
  /** The bell rang with this change: the badge pops. */
  pop: boolean;
}

export interface BellMotionSnapshot {
  /** How many rings were asked for since the page loaded: the icon swings each time it grows. */
  rings: number;
  /** The newest change worth animating, or null. */
  change: BellChange | null;
}

/** No cue yet. */
export const IDLE_MOTION: BellMotionSnapshot = Object.freeze({ rings: 0, change: null });

export interface BellMotionEnv {
  now(): number;
  /** True while the tab is in the foreground. */
  isVisible(): boolean;
  /** True when the staff member asked for reduced motion. */
  reducedMotion(): boolean;
  /** Calls `listener` whenever the tab's visibility changes; returns the function that stops it. */
  onVisibilityChange(listener: () => void): () => void;
}

export interface BellMotion {
  /** For `useSyncExternalStore`. The first listener starts watching the tab's visibility, the last one stops it. */
  subscribe(listener: () => void): () => void;
  /** The cues; the same object until the next cue. */
  getSnapshot(): BellMotionSnapshot;
  /** A `notification.created` frame. Call it before the number reaches the cache, so the bell never sees the number without its cue. */
  arrival(unread: number, live: boolean): void;
  /**
   * A read: a `notification.read` frame (this tab, another tab or another device) with its number, or `null` from a read action of this tab whose new number
   * is not known yet. Call it before the number reaches the cache.
   */
  read(unread: number | null): void;
}

function clamp(count: number): number {
  return Math.min(UNREAD_CAP, Math.max(0, Math.trunc(count)));
}

/**
 * The cues of the page's bell:
 * - only a live arrival rings (`notification.created` with `live: true`), never a first load, a poll that finds more, a replay after a reconnect or a resync;
 * - at most one ring every 3 s (a timestamp, no timer); the number rolls for every item;
 * - only a visible tab rings, as only a visible tab toasts (the tabs share one stream, so every tab updates its badge); a tab that was hidden when something
 *   arrived rings once when the staff member comes back;
 * - a read rolls the number down and never rings: the stream's `notification.read` says the new number, a read action of this tab says "the next lower
 *   number" (its own refetch and the stream's event may land in either order);
 * - reduced motion: no cue at all, the number just changes (the CSS plays nothing either).
 */
export function createBellMotion(env: BellMotionEnv): BellMotion {
  let snapshot = IDLE_MOTION;
  const listeners = new Set<() => void>();
  let stopVisibility: (() => void) | undefined;
  let lastRingAt: number | null = null;
  /** A live item arrived while the tab was hidden: ring once when it is shown again. */
  let missed = false;

  function publish(next: BellMotionSnapshot) {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  }

  /** True (and the window starts again) when no ring played in the last `RING_WINDOW_MS`. A timestamp, no timer. */
  function takeRing(): boolean {
    const now = env.now();
    if (lastRingAt !== null && now - lastRingAt < RING_WINDOW_MS) return false;
    lastRingAt = now;
    return true;
  }

  function nextChange(unread: number | null, pop: boolean): BellChange {
    return { seq: (snapshot.change?.seq ?? 0) + 1, to: unread === null ? null : clamp(unread), pop };
  }

  /** The staff member comes back to a tab that missed a live item: one ring, no pop (the number is already right). */
  function onVisibility() {
    if (!env.isVisible() || !missed) return;
    missed = false;
    if (env.reducedMotion() || !takeRing()) return;
    publish({ ...snapshot, rings: snapshot.rings + 1 });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) stopVisibility = env.onVisibilityChange(onVisibility);
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        stopVisibility?.();
        stopVisibility = undefined;
      };
    },
    getSnapshot: () => snapshot,
    arrival(unread, live) {
      // A replayed item (reconnect, hand-over between tabs) is not news.
      if (!live) return;
      if (!env.isVisible()) {
        missed = true;
        return;
      }
      if (env.reducedMotion()) return;
      const ring = takeRing();
      publish({ rings: snapshot.rings + (ring ? 1 : 0), change: nextChange(unread, ring) });
    },
    read(unread) {
      // Everything was read meanwhile (in another tab): there is nothing to ring for on return.
      if (unread !== null && clamp(unread) === 0) missed = false;
      if (!env.isVisible() || env.reducedMotion()) return;
      publish({ rings: snapshot.rings, change: nextChange(unread, false) });
    },
  };
}

/** What the bell plays now. Plain data: the bell renders it, `nextBellView` moves it on, `settleBellView` ends a part. */
export interface BellView {
  /** The number and its badge text on screen ('' when there is no badge). */
  count: number;
  text: string;
  /** The cue counters already played (or skipped): a bell never plays a cue older than itself. */
  rings: number;
  seq: number;
  /** The icon swings. Its key is `rings`, so a new ring starts it again. */
  ring: boolean;
  /** The badge pops ('pop') or pops in from nothing ('in'). `popKey` restarts it. */
  pop: 'pop' | 'in' | null;
  popKey: number;
  /** The old number leaves while the new one comes in: up when the count grew, down when it fell. `rollKey` restarts it. */
  roll: { from: string; up: boolean } | null;
  rollKey: number;
}

/** The bell's first view: the number as it is, and every cue so far counts as played (a mount never animates). */
export function initialBellView(count: number, text: string, motion: BellMotionSnapshot): BellView {
  return {
    count,
    text,
    rings: motion.rings,
    seq: motion.change?.seq ?? 0,
    ring: false,
    pop: null,
    popKey: 0,
    roll: null,
    rollKey: 0,
  };
}

/**
 * The view for this render; `view` itself when nothing changed (the bell sets its state only then).
 * - A new ring count swings the icon.
 * - A new cue plays only once the bell shows its number (the cue lands a moment before the cache's number), or for a read action's cue the first number
 *   below the one on screen. The badge pops in from nothing when it was hidden; else the number rolls (when its text changed: 99+ to 99+ does not) and
 *   the badge pops when the bell rang.
 * - A change no cue explains (the first read, a poll, a resync, `unread.changed`) just changes the number; a waiting cue is dropped then, so a later
 *   number cannot replay it.
 */
export function nextBellView(
  view: BellView,
  count: number,
  text: string,
  motion: BellMotionSnapshot,
): BellView {
  let next = view;
  if (motion.rings !== view.rings) {
    next = { ...next, rings: motion.rings, ring: motion.rings > view.rings || view.ring };
  }
  const cue = motion.change !== null && motion.change.seq !== view.seq ? motion.change : null;
  if (cue !== null && (cue.to === count || (cue.to === null && count < view.count))) {
    next = { ...next, count, text, seq: cue.seq };
    if (count === 0) {
      next = { ...next, pop: null, roll: null };
    } else if (view.count === 0) {
      next = { ...next, pop: 'in', popKey: cue.seq, roll: null };
    } else {
      const roll = { from: view.text, up: count > view.count };
      if (text !== view.text) next = { ...next, roll, rollKey: cue.seq };
      if (cue.pop) next = { ...next, pop: 'pop', popKey: cue.seq };
    }
  } else if (count !== view.count || text !== view.text) {
    next = { ...next, count, text, seq: cue?.seq ?? next.seq, roll: null };
  }
  return next;
}

/** The keyframes of the bell (src/styles/index.css) and the part of the view each one ends. The arriving number ends with the leaving one. */
const ENDS: Record<string, 'ring' | 'pop' | 'roll'> = {
  'bell-ring': 'ring',
  'badge-pop': 'pop',
  'badge-in': 'pop',
  'count-out-up': 'roll',
  'count-out-down': 'roll',
};

/** The view after the animation `animationName` ended: that part is at rest, so nothing replays it later. */
export function settleBellView(view: BellView, animationName: string): BellView {
  const part = ENDS[animationName];
  if (part === undefined || !view[part]) return view;
  return part === 'ring' ? { ...view, ring: false } : { ...view, [part]: null };
}

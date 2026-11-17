// The "(n) " prefix of the tab title while the tab is hidden and something is unread ("(3) Orders · IMEI-HUB", 99+ at the cap; owner, 2026-11-15; the
// website's title follows the same rules). Pure: the title, the visibility and the watcher are passed in (hooks/useBellMotion.ts wires the browser).

/** One or more prefixes this module writes: "(3) ", "(99+) ". */
const PREFIX = /^(?:\(\d+\+?\) )+/;

/** `title` without the module's prefix. */
export function stripTitleBadge(title: string): string {
  return title.replace(PREFIX, '');
}

/** `title` with exactly one prefix for `text`, or none when `text` is null. */
export function titleWithBadge(title: string, text: string | null): string {
  const bare = stripTitleBadge(title);
  return text === null ? bare : `(${text}) ${bare}`;
}

export interface TitleBadgeEnv {
  getTitle(): string;
  setTitle(title: string): void;
  /** True while the tab is in the foreground. */
  isVisible(): boolean;
  /** Calls `listener` whenever the tab's visibility changes; returns the function that stops it. */
  onVisibilityChange(listener: () => void): () => void;
  /** Calls `listener` after the title may have changed (a <title> added, removed or rewritten); returns the stop function. */
  watchTitle(listener: () => void): () => void;
}

export interface TitleBadge {
  /** Registers or updates one bell: its unread number and the text the title shows for it. */
  set(owner: object, count: number, text: string): void;
  /** Unregisters a bell (unmount). The prefix goes with the last one. */
  remove(owner: object): void;
}

/**
 * The title's prefix:
 * - only while the tab is hidden and the number is above 0; it goes when the number reaches 0 or the tab is shown again (the bell then rings once when
 *   something arrived meanwhile);
 * - the shell rewrites the title on every page change (useDocumentTitle): while a prefix is due, the document is watched for a new or rewritten <title> and
 *   the prefix is put back. Every write strips the prefix first, so it is never doubled; a title this module never prefixed is never touched;
 * - each mounted bell registers its number; the highest wins and the prefix goes with the last one.
 */
export function createTitleBadge(env: TitleBadgeEnv): TitleBadge {
  const owners = new Map<object, { count: number; text: string }>();
  /** The title carries a prefix of ours. */
  let applied = false;
  let stopWatch: (() => void) | undefined;
  let stopVisibility: (() => void) | undefined;

  /** The text the title should show now, or null for none. */
  function wanted(): string | null {
    if (env.isVisible()) return null;
    let top: { count: number; text: string } | null = null;
    for (const entry of owners.values()) if (top === null || entry.count > top.count) top = entry;
    return top !== null && top.count > 0 ? top.text : null;
  }

  function sync() {
    const text = wanted();
    if (text === null && !applied) return;
    const current = env.getTitle();
    const next = titleWithBadge(current, text);
    if (next !== current) env.setTitle(next);
    applied = text !== null;
    if (applied) {
      // Our own write wakes the watcher too: it then finds the title right and writes nothing.
      stopWatch ??= env.watchTitle(sync);
    } else {
      stopWatch?.();
      stopWatch = undefined;
    }
  }

  return {
    set(owner, count, text) {
      owners.set(owner, { count, text });
      stopVisibility ??= env.onVisibilityChange(sync);
      sync();
    },
    remove(owner) {
      if (!owners.delete(owner)) return;
      sync();
      if (owners.size > 0) return;
      stopVisibility?.();
      stopVisibility = undefined;
    },
  };
}

// What the polite live region of the page says when a status changes: the verdict word and the state word of each KPI tile
// ("System status is now Degraded."). Pure functions plus one small hook; the first load announces nothing.
import { useState } from 'react';
import { statusMeta } from '../lib';
import type { SystemHealth } from '../types';
import type { KpiModel } from './useKpis';
import { STATUS_UNAVAILABLE, verdictLook } from './verdict';

/** One thing the live region watches. `word` is null while there is nothing to say yet (still loading). */
export interface AnnouncementItem {
  key: string;
  label: string;
  word: string | null;
}

/**
 * The messages for items whose word differs from the one seen before, and the words to remember. An item with no word
 * keeps its last one, and an item seen for the first time is remembered without a message. `changed` says whether the
 * remembered words are not the same as before.
 */
export function changesBetween(
  previous: ReadonlyMap<string, string>,
  items: readonly AnnouncementItem[],
): { next: Map<string, string>; messages: string[]; changed: boolean } {
  const next = new Map(previous);
  const messages: string[] = [];
  let changed = false;
  for (const item of items) {
    if (item.word === null) continue;
    const before = previous.get(item.key);
    if (before === item.word) continue;
    if (before !== undefined) messages.push(`${item.label} is now ${item.word}.`);
    next.set(item.key, item.word);
    changed = true;
  }
  return { next, messages, changed };
}

/** The state word of a tile: its badge word, "No data" for a null value, "Unavailable" for a read that failed. */
function tileWord(tile: KpiModel): string | null {
  if (tile.figure)
    return tile.figure.measure.value === null ? 'No data' : statusMeta(tile.figure.measure.state).word;
  return tile.query.isError ? 'Unavailable' : null;
}

/** The overall verdict first, then the six tiles, as the page shows them. */
export function announcementItems(
  health: { data: SystemHealth | undefined; isError: boolean },
  tiles: readonly KpiModel[],
): AnnouncementItem[] {
  let overall: string | null = null;
  if (health.data)
    overall = verdictLook(health.data.status, health.data.monitoring.status === 'unavailable').word;
  else if (health.isError) overall = STATUS_UNAVAILABLE.word;
  return [
    { key: 'overall', label: 'System status', word: overall },
    ...tiles.map((tile) => ({ key: tile.id, label: tile.label, word: tileWord(tile) })),
  ];
}

/**
 * The text for the live region: what changed in the latest update, kept until the next change. The words seen so far live
 * in state and are compared while rendering (the React way to react to changed props), so no effect is needed.
 */
export function useAnnouncement(items: readonly AnnouncementItem[]): string {
  const [seen, setSeen] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [message, setMessage] = useState('');
  const { next, messages, changed } = changesBetween(seen, items);
  if (changed) {
    setSeen(next);
    if (messages.length > 0) setMessage(messages.join(' '));
  }
  return message;
}

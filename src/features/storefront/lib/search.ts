// Small pure helpers of the Search tab's index panel: byte text, the words under the figures and the plain sentence for a last error.
// Nothing here talks to the API.
import type { BadgeTone, IconName } from '@/components/ui';
import type { EngineStatus } from '../types';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Bytes in steps of 1024 ("48 MB", "1.2 GB"); "No data" for a missing figure. */
export function bytesText(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return 'No data';
  let value = Math.abs(bytes);
  let step = 0;
  while (step < BYTE_UNITS.length - 1 && Math.round(value) >= 1024) {
    value /= 1024;
    step += 1;
  }
  const text = step > 0 && value < 10 ? value.toFixed(1).replace(/\.0$/, '') : String(Math.round(value));
  return `${text} ${BYTE_UNITS[step]}`;
}

/** How each engine state reads: the word, its tone and its icon (a state is never colour alone). */
export const ENGINE_BADGE: Record<EngineStatus, { tone: BadgeTone; icon: IconName; word: string }> = {
  ok: { tone: 'good', icon: 'checkCircle', word: 'Running' },
  down: { tone: 'crit', icon: 'xCircle', word: 'Not answering' },
  not_ready: { tone: 'warn', icon: 'loader', word: 'Not ready' },
  disabled: { tone: 'neutral', icon: 'pause', word: 'Switched off' },
};

/** The line under the document count: in sync, or how many services the index lacks or holds too many of. */
export function documentsNote(documents: number, expected: number): string {
  const gap = expected - documents;
  if (gap === 0) return 'in sync with the catalogue';
  return gap > 0 ? `${gap} missing from the index` : `${-gap} more than the catalogue`;
}

/** What the shop does while the engine is not running (backend plan §5.5: the database search answers); nothing for a healthy one. */
export function engineNote(status: EngineStatus, version: string | null): string | undefined {
  if (status === 'ok') return version ? `Typesense ${version}` : undefined;
  return status === 'not_ready'
    ? 'no index yet; the shop uses the database search'
    : 'the shop uses the database search meanwhile';
}

/**
 * A plain sentence for a last error the staff can act on: the engine refuses writes when its disk is nearly full (answer 422
 * "Rejecting write: running out of resource…"). Other errors show as the server wrote them, with no extra sentence.
 */
export function lastErrorHint(lastError: string | null): string | undefined {
  return lastError && /running out of resource/i.test(lastError)
    ? 'The search server is refusing writes because its disk is nearly full. Free some space; the next check against the database repairs the index.'
    : undefined;
}

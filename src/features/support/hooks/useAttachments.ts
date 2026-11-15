// The files on the message being written (feature 28, rule 8): one chip per file with its state. A file uploads as soon as it is picked
// (`uploadTicketFile`); `ready` chips give the `fileIds` of the reply or note. A wrong file (type, size, count) becomes an `error` chip at once, and the server's own
// refusal lands on the same chip. `fetch` has no upload progress, so a chip is `uploading`, `ready` or `error`. Removing a chip cancels its upload.
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { uploadTicketFile } from '../api';
import { refusalFor } from '../lib/attachments';

/** One file on the message: its state is `uploading`, `ready` (it has a `fileId`) or `error` (it has a `problem`). */
export type Chip = {
  key: number;
  name: string;
  size: number;
  state: 'uploading' | 'ready' | 'error';
  fileId?: number;
  problem?: string;
};

/** The sentence for a refused upload: the server's message on the file field first, else its general one. */
function uploadProblem(error: unknown): string {
  if (isApiError(error)) return error.fieldErrors.file?.[0] ?? errorText(error);
  return errorText(error);
}

export function useAttachments(ticketId: number) {
  const [chips, setChipsState] = useState<readonly Chip[]>([]);
  // The latest chips, written together with the state, so a handler never counts from a stale render and the updates stay plain values.
  const latest = useRef<readonly Chip[]>([]);
  const uploads = useRef(new Map<number, AbortController>());
  const nextKey = useRef(1);

  const setChips = useCallback((next: readonly Chip[]) => {
    latest.current = next;
    setChipsState(next);
  }, []);
  const patch = useCallback(
    (key: number, change: Partial<Chip>) =>
      setChips(latest.current.map((chip) => (chip.key === key ? { ...chip, ...change } : chip))),
    [setChips],
  );

  // Leaving the ticket cancels uploads still running.
  useEffect(() => {
    const running = uploads.current;
    return () => {
      for (const controller of running.values()) controller.abort();
      running.clear();
    };
  }, []);

  /** Starts the upload of every picked file that passes the rules; the others get an error chip with the reason. */
  const add = useCallback(
    (files: readonly File[]) => {
      let kept = latest.current.filter((chip) => chip.state !== 'error').length;
      const added: Chip[] = [];
      for (const file of files) {
        const key = nextKey.current++;
        const refusal = refusalFor(file, kept);
        if (refusal) {
          added.push({ key, name: file.name, size: file.size, state: 'error', problem: refusal });
          continue;
        }
        kept += 1;
        added.push({ key, name: file.name, size: file.size, state: 'uploading' });
        const controller = new AbortController();
        uploads.current.set(key, controller);
        uploadTicketFile(ticketId, { file }, { signal: controller.signal }).then(
          (stored) => {
            uploads.current.delete(key);
            patch(key, { state: 'ready', fileId: stored.id });
          },
          (error: unknown) => {
            uploads.current.delete(key);
            if (!controller.signal.aborted) patch(key, { state: 'error', problem: uploadProblem(error) });
          },
        );
      }
      setChips([...latest.current, ...added]);
    },
    [ticketId, patch, setChips],
  );

  /** Drops a chip; a file still uploading is cancelled. */
  const remove = useCallback(
    (key: number) => {
      uploads.current.get(key)?.abort();
      uploads.current.delete(key);
      setChips(latest.current.filter((chip) => chip.key !== key));
    },
    [setChips],
  );

  /** Forgets every chip once the message has been sent. */
  const clear = useCallback(() => setChips([]), [setChips]);

  const fileIds = chips.flatMap((chip) =>
    chip.state === 'ready' && chip.fileId !== undefined ? [chip.fileId] : [],
  );
  return {
    chips,
    add,
    remove,
    clear,
    fileIds,
    uploading: chips.some((chip) => chip.state === 'uploading'),
    failed: chips.some((chip) => chip.state === 'error'),
  };
}

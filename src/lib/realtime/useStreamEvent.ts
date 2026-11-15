// Hooks that read the live stream: one event by name, "the screen should refetch", and the stream's status. They need <StreamProvider/> above them;
// without one they do nothing (a component can be rendered and tested alone). Feature code uses these, never the client.
import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { isKnownStreamEvent, STREAM_PARSERS, type KnownStreamEvent, type StreamEventMap } from './events';
import { StreamContext } from './streamContext';
import type { StreamEventMeta, StreamStatus } from './streamEnv';

/**
 * Calls `handler` for each event called `name`. A known event (see `StreamEventMap`) arrives parsed and typed; a frame that does not have the documented
 * shape is skipped. Any other name works too and arrives as `unknown` (another feature's own events). The latest `handler` is always used, so it needs no
 * `useCallback`; the subscription lasts as long as the component and `name`. `meta.refetch` tells a `ready` or `resync` that asks the screen to refetch.
 */
export function useStreamEvent<K extends KnownStreamEvent>(
  name: K,
  handler: (data: StreamEventMap[K], meta: StreamEventMeta) => void,
): void;
export function useStreamEvent(name: string, handler: (data: unknown, meta: StreamEventMeta) => void): void;
export function useStreamEvent(name: string, handler: (data: never, meta: StreamEventMeta) => void): void {
  const client = useContext(StreamContext);
  const latest = useRef(handler as (data: unknown, meta: StreamEventMeta) => void);
  useEffect(() => {
    latest.current = handler as (data: unknown, meta: StreamEventMeta) => void;
  });
  useEffect(() => {
    if (!client) return;
    return client.subscribe(name, (data, meta) => {
      if (!isKnownStreamEvent(name)) {
        latest.current(data, meta);
        return;
      }
      const parsed = STREAM_PARSERS[name](data);
      if (parsed !== null) latest.current(parsed, meta);
    });
  }, [client, name]);
}

/**
 * Calls `handler` when what is on screen may be stale: the server sent `resync`, or the stream came back (a `ready` that resumed a cursor or is not the first
 * this tab saw). Refetch the open list once; the stream does not repeat what it cannot replay.
 */
export function useStreamRefetch(handler: () => void): void {
  useStreamEvent('ready', (_data, meta) => {
    if (meta.refetch) handler();
  });
  useStreamEvent('resync', () => handler());
}

const NO_SUBSCRIBE = () => () => {};
const IDLE = (): StreamStatus => 'idle';

/** The stream's status in this tab: `open` while events arrive (through this tab or the tab that holds the stream). `idle` without a provider. */
export function useStreamStatus(): StreamStatus {
  const client = useContext(StreamContext);
  return useSyncExternalStore(client ? client.onStatus : NO_SUBSCRIBE, client ? client.status : IDLE);
}

/** True while the stream is open: a screen then polls rarely instead of often. */
export function useStreamOpen(): boolean {
  return useStreamStatus() === 'open';
}

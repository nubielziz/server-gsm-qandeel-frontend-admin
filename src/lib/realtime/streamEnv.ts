// What the stream client needs from the browser, as small interfaces, and the numbers it is tuned with. Nothing here touches a browser global:
// `browserEnv.ts` fills these in for the page, tests fill them in with fakes.

/** Where the stream stands for this tab. `open`: events are arriving (through this tab or the tab that holds the stream). `refused`: the server said the session is gone. */
export type StreamStatus = 'idle' | 'connecting' | 'open' | 'retrying' | 'refused';

/** The part of a `MessageEvent` the client reads. */
export interface StreamMessage {
  data?: unknown;
  lastEventId?: string;
}

/** The part of `EventSource` the client uses. */
export interface EventSourceLike {
  addEventListener(type: string, listener: (event: StreamMessage) => void): void;
  removeEventListener(type: string, listener: (event: StreamMessage) => void): void;
  close(): void;
}

/** The part of `navigator.locks` the client uses: a request that is granted when the lock is free and held until the callback's promise settles. */
export interface LocksLike {
  request(
    name: string,
    options: { mode?: 'exclusive'; signal?: AbortSignal },
    callback: () => Promise<unknown>,
  ): Promise<unknown>;
}

/** The part of `BroadcastChannel` the client uses. */
export interface ChannelLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export interface TimersLike {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** Page lifecycle: `onHide` is `pagehide` and `freeze`, `onShow` is `pageshow` and `resume`. Each answers the function that removes the listener. */
export interface LifecycleLike {
  onHide(callback: () => void): () => void;
  onShow(callback: () => void): () => void;
}

/** What the plain route asked after a failed connect answered. `status` 0 means no answer (network error or timeout). */
export interface ProbeResult {
  status: number;
  retryAfterSeconds?: number;
}

/** Everything the client takes from outside. `locks` and `createChannel` are optional: without either, every tab opens its own stream. */
export interface StreamEnv {
  /** The address of the stream for this cursor (the cursor is a query parameter). */
  streamUrl(cursor: string | null): string;
  createEventSource(url: string): EventSourceLike;
  /** Name of the Web Lock and of the BroadcastChannel: one per browser and surface. */
  lockName: string;
  locks?: LocksLike | null;
  createChannel?: ((name: string) => ChannelLike) | null;
  timers: TimersLike;
  /** A number in [0, 1), like `Math.random`. */
  random(): number;
  /** Asks the surface's plain route why the stream could not be opened. */
  probe(): Promise<ProbeResult>;
  lifecycle?: LifecycleLike | null;
  /** The key that makes an event count once (see `streamDedupeKey`); no key, no dedupe. */
  dedupeKey?: (name: string, data: unknown) => string | undefined;
  /** A subscriber that throws is reported here and never stops the others. */
  onListenerError?: (error: unknown) => void;
}

/** What a subscriber is told about an event besides its data. */
export interface StreamEventMeta {
  /** The event's id (the connection's cursor after it), or null when the server sent none. */
  cursor: string | null;
  /** True for a `resync`, and for a `ready` that resumed or is not the first this tab saw: refetch what is on screen once. */
  refetch: boolean;
  /** True when another tab of this browser holds the stream and passed the event on. */
  relayed: boolean;
}

export type StreamListener = (data: unknown, meta: StreamEventMeta) => void;

/** The client's public face. `status` and `onStatus` do not use `this`, so they can be handed to `useSyncExternalStore` as they are. */
export interface StreamClient {
  /** Joins the stream of this browser. Calling it again does nothing until `stop`. */
  start(): void;
  /** Leaves: closes what this tab holds, hands the stream to another tab, forgets the cursor. Subscribers stay. */
  stop(): void;
  /** Listens to one event by name; any name works, so a feature can use its own. Answers the function that stops listening. */
  subscribe(name: string, listener: StreamListener): () => void;
  status(): StreamStatus;
  onStatus(listener: () => void): () => void;
}

/** First pause after a failure, doubled each time up to the maximum, and its random spread (plus or minus 20 %). */
export const BACKOFF_BASE_MS = 5_000;
export const BACKOFF_MAX_MS = 60_000;
export const BACKOFF_JITTER = 0.2;
/** No event at all (not even a heartbeat) for this long: the connection is dead. The server beats every 15 s. */
export const WATCHDOG_MS = 45_000;
/** After a 429, and after the third refusal in a row, wait at least this long. */
export const MIN_REFUSAL_WAIT_MS = 60_000;
export const REFUSALS_BEFORE_LONG_WAIT = 3;
/** The probe gives up after this long and counts as "no answer". */
export const PROBE_TIMEOUT_MS = 15_000;
/** How many event keys the dedupe remembers. */
export const SEEN_LIMIT = 500;

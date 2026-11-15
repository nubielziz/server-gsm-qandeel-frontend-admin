// Dev and test stand-in for the staff stream (`GET /admin/stream`): a fake EventSource and `pushMockStreamEvent(name, data)`, so the live screens can be built
// and tested without a server. Mock routes call `pushMockStreamEvent` the way the real API rings its doorbell. Never in a production build (decisions 014, 018).
import type { EventSourceLike, StreamMessage } from '@/lib/realtime';

type Listener = (event: StreamMessage) => void;

const instances = new Set<MockEventSource>();
let original: typeof EventSource | undefined;

/** A fake `EventSource`: it opens, says `ready` and beats every 15 s like the server; `pushMockStreamEvent` feeds it the rest. */
export class MockEventSource implements EventSourceLike {
  /** The browser glue reads this: with a mock every tab keeps its own stream (a pushed event reaches only the tab that made the request). */
  static readonly isMockEventSource = true;
  /** Delay before `open` and `ready`. Tests set 0. */
  static readyDelayMs = 20;
  /** Heartbeat period; 0 turns it off. */
  static heartbeatMs = 15_000;

  readonly url: string;
  readyState = 0;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readyTimer: ReturnType<typeof setTimeout> | undefined;
  private beatTimer: ReturnType<typeof setInterval> | undefined;

  constructor(url: string | URL, _init?: { withCredentials?: boolean }) {
    this.url = String(url);
    instances.add(this);
    this.readyTimer = setTimeout(() => {
      this.readyState = 1;
      this.send('open', undefined);
      this.send('ready', {
        v: 1,
        heartbeatMs: MockEventSource.heartbeatMs || 15_000,
        resumed: false,
        serverTime: new Date().toISOString(),
      });
      if (MockEventSource.heartbeatMs > 0) {
        this.beatTimer = setInterval(
          () => this.send('hb', Math.floor(Date.now() / 1000)),
          MockEventSource.heartbeatMs,
        );
      }
    }, MockEventSource.readyDelayMs);
  }

  addEventListener(type: string, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = 2;
    clearTimeout(this.readyTimer);
    clearInterval(this.beatTimer);
    instances.delete(this);
  }

  /** Delivers one frame to this source's listeners. `data` goes out as JSON, like the server's one `data:` line. */
  send(type: string, data: unknown, id = ''): void {
    const event =
      data === undefined
        ? new Event(type)
        : new MessageEvent(type, { data: JSON.stringify(data), lastEventId: id });
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event as StreamMessage);
  }
}

/** Sends an event to every open mock stream, as if the server had written it. `id` is the cursor after it. */
export function pushMockStreamEvent(name: string, data: unknown, id?: string): void {
  for (const source of [...instances]) if (source.readyState === 1) source.send(name, data, id);
}

/** How many mock streams are open now (a test waits for one before it pushes). */
export function openMockStreamCount(): number {
  return [...instances].filter((source) => source.readyState === 1).length;
}

/** Makes every mock stream fail the way a dropped connection does: an `error` event (the client closes the source and reopens another). */
export function failMockStreams(): void {
  for (const source of [...instances]) source.send('error', undefined);
}

/** Closes every mock stream (tests, after each test). */
export function resetMockStreams(): void {
  for (const source of [...instances]) source.close();
}

/** Makes `new EventSource()` the mock, until `uninstallMockEventSource`. The dev worker does it at start; a test does it in `beforeEach`. */
export function installMockEventSource(): void {
  if (globalThis.EventSource !== (MockEventSource as unknown)) original = globalThis.EventSource;
  globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
}

export function uninstallMockEventSource(): void {
  resetMockStreams();
  if (original) globalThis.EventSource = original;
  else delete (globalThis as { EventSource?: unknown }).EventSource;
  original = undefined;
}

// Fakes for the stream client's tests: a clock you move by hand, EventSources you feed, one Web Lock shared by several "tabs", a BroadcastChannel between them,
// and a probe you script. `createWorld()` builds the shared parts; `world.tab()` makes one tab with its own client. Import from tests only.
import { createStreamClient } from '../streamClient';
import type {
  ChannelLike,
  EventSourceLike,
  LocksLike,
  ProbeResult,
  StreamClient,
  StreamEnv,
  StreamMessage,
  TimersLike,
} from '../streamEnv';

/** Lets promise callbacks and queued channel messages run. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

type Task = { at: number; id: number; owner: string; run: () => void };

/** A clock that moves only when told to. Every task belongs to a tab, so a tab that "crashes" takes its timers with it. */
export class FakeClock {
  now = 0;
  private seq = 0;
  private tasks = new Map<number, Task>();

  forTab(owner: string): TimersLike {
    return {
      setTimeout: (run, ms) => {
        const id = (this.seq += 1);
        this.tasks.set(id, { at: this.now + ms, id, owner, run });
        return id;
      },
      clearTimeout: (handle) => {
        this.tasks.delete(handle as number);
      },
    };
  }

  /** Moves time forward, running every task that falls due in order and letting promises settle after each. */
  async advance(ms: number): Promise<void> {
    const target = this.now + ms;
    for (;;) {
      await flush();
      const due = [...this.tasks.values()]
        .filter((task) => task.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id);
      const next = due[0];
      if (!next) break;
      this.now = next.at;
      this.tasks.delete(next.id);
      next.run();
    }
    this.now = target;
    await flush();
  }

  /** Delays (ms from now) of the timers a tab still holds, soonest first. */
  pendingDelays(owner: string): number[] {
    return [...this.tasks.values()]
      .filter((task) => task.owner === owner)
      .map((task) => task.at - this.now)
      .sort((a, b) => a - b);
  }

  cancelOwner(owner: string): void {
    for (const task of [...this.tasks.values()]) if (task.owner === owner) this.tasks.delete(task.id);
  }
}

/** An EventSource you feed by hand. */
export class FakeEventSource implements EventSourceLike {
  closed = false;
  private listeners = new Map<string, Set<(event: StreamMessage) => void>>();

  readonly url: string;
  readonly tab: string;

  constructor(url: string, tab: string) {
    this.url = url;
    this.tab = tab;
  }

  addEventListener(type: string, listener: (event: StreamMessage) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: StreamMessage) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  /** The names this source listens to (not `error` and `open`). */
  names(): string[] {
    return [...this.listeners.entries()]
      .filter(([name, set]) => set.size > 0 && name !== 'error' && name !== 'open')
      .map(([name]) => name)
      .sort();
  }

  /** Delivers a frame. `data` is sent as JSON unless it is already a string (to send garbage). `id` is the event id. */
  emit(name: string, data?: unknown, id?: string): void {
    if (this.closed) return;
    const raw = typeof data === 'string' ? data : data === undefined ? undefined : JSON.stringify(data);
    for (const listener of [...(this.listeners.get(name) ?? [])])
      listener({ data: raw, lastEventId: id ?? '' });
  }

  /** The connection failed or dropped. */
  fail(): void {
    this.emit('error');
  }
}

type Waiting = { tab: string; signal?: AbortSignal; grant: () => void; reject: (error: unknown) => void };

/** One Web Lock for every tab of the world: granted in order, released when the holder's callback settles or its tab dies. */
export class FakeLocks {
  private holder: { tab: string; release: () => void } | null = null;
  private queue: Waiting[] = [];

  /** Make `request` fail with this error (a browser that refuses the Web Locks API). */
  refuseWith: Error | null = null;

  forTab(tab: string): LocksLike {
    return {
      request: (_name, options, callback) =>
        new Promise((resolve, reject) => {
          if (this.refuseWith) {
            reject(this.refuseWith);
            return;
          }
          const signal = options.signal;
          if (signal?.aborted) {
            reject(abortError());
            return;
          }
          const waiting: Waiting = {
            tab,
            signal,
            reject,
            grant: () => {
              const done = (): void => {
                if (this.holder?.tab === tab) this.holder = null;
                resolve(undefined);
                this.pump();
              };
              this.holder = { tab, release: done };
              void Promise.resolve(callback()).then(done, done);
            },
          };
          signal?.addEventListener('abort', () => {
            if (!this.queue.includes(waiting)) return;
            this.queue = this.queue.filter((item) => item !== waiting);
            reject(abortError());
          });
          this.queue.push(waiting);
          void Promise.resolve().then(() => this.pump());
        }),
    };
  }

  private pump(): void {
    if (this.holder) return;
    const next = this.queue.shift();
    next?.grant();
  }

  /** Who holds the lock now. */
  heldBy(): string | null {
    return this.holder?.tab ?? null;
  }

  /** The browser takes the lock away from its holder (a `steal`): the holder's request settles while its callback is still running. */
  revoke(): void {
    this.holder?.release();
  }

  /** A tab closed or crashed: its lock is released, its waiting requests vanish. */
  drop(tab: string): void {
    this.queue = this.queue.filter((item) => item.tab !== tab);
    if (this.holder?.tab === tab) {
      this.holder = null;
      void Promise.resolve().then(() => this.pump());
    }
  }
}

function abortError(): Error {
  const error = new Error('The lock request was aborted.');
  error.name = 'AbortError';
  return error;
}

/** A BroadcastChannel between the tabs of a world: a message reaches every other open channel of the same name, one microtask later, as a copy. */
class FakeChannel implements ChannelLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  closed = false;

  private readonly hub: ChannelHub;
  readonly name: string;
  readonly tab: string;

  constructor(hub: ChannelHub, name: string, tab: string) {
    this.hub = hub;
    this.name = name;
    this.tab = tab;
  }

  postMessage(message: unknown): void {
    if (this.closed) throw new Error('InvalidStateError: the channel is closed');
    const copy = JSON.parse(JSON.stringify(message)) as unknown;
    for (const other of this.hub.channels) {
      if (other === this || other.closed || other.name !== this.name) continue;
      void Promise.resolve().then(() => {
        if (!other.closed) other.onmessage?.({ data: copy });
      });
    }
  }

  close(): void {
    this.closed = true;
  }
}

class ChannelHub {
  channels = new Set<FakeChannel>();
}

export interface TabOptions {
  /** `false`: this browser has no Web Locks (every tab opens its own stream). */
  locks?: boolean;
  /** `false`: this browser has no BroadcastChannel. */
  channel?: boolean;
  /** Turns the cursor into the stream address. */
  dedupeKey?: StreamEnv['dedupeKey'];
}

export interface Tab {
  id: string;
  client: StreamClient;
  /** Every EventSource this tab opened, oldest first. */
  sources: FakeEventSource[];
  /** The open one, if any. */
  source(): FakeEventSource | undefined;
  /** `pagehide` / `freeze` and `pageshow` / `resume`. */
  hide(): void;
  show(): void;
  /** The tab closes without saying goodbye: its stream, timers and lock vanish. */
  kill(): void;
  errors: unknown[];
}

/** The shared parts and a factory for tabs. `random` is what the back-off's spread reads (0.5 = no spread). */
export function createWorld() {
  const clock = new FakeClock();
  const locks = new FakeLocks();
  const hub = new ChannelHub();
  const world = {
    clock,
    locks,
    random: 0.5,
    /** The answers of the probe, one per call; the last one repeats. */
    probeResults: [{ status: 200 }] as ProbeResult[],
    probeCalls: 0,
    /** Set to make the probe never answer. */
    probeHangs: false,
    /** Sends a raw message to every open channel, as a page of the same origin could. */
    broadcastRaw(message: unknown): void {
      for (const channel of hub.channels) if (!channel.closed) channel.onmessage?.({ data: message });
    },
    tab(id: string, options: TabOptions = {}): Tab {
      const sources: FakeEventSource[] = [];
      const errors: unknown[] = [];
      const hideListeners = new Set<() => void>();
      const showListeners = new Set<() => void>();
      const withLocks = options.locks !== false;
      const withChannel = options.channel !== false;
      const env: StreamEnv = {
        streamUrl: (cursor) => (cursor ? `/stream?cursor=${cursor}` : '/stream'),
        createEventSource: (url) => {
          const source = new FakeEventSource(url, id);
          sources.push(source);
          return source;
        },
        lockName: 'gsm-stream-test',
        locks: withLocks ? locks.forTab(id) : null,
        createChannel: withChannel
          ? (name) => {
              const channel = new FakeChannel(hub, name, id);
              hub.channels.add(channel);
              return channel;
            }
          : null,
        timers: clock.forTab(id),
        random: () => world.random,
        probe: () => {
          world.probeCalls += 1;
          if (world.probeHangs) return new Promise<ProbeResult>(() => {});
          const index = Math.min(world.probeCalls - 1, world.probeResults.length - 1);
          return Promise.resolve(world.probeResults[index]);
        },
        lifecycle: {
          onHide: (callback) => {
            hideListeners.add(callback);
            return () => hideListeners.delete(callback);
          },
          onShow: (callback) => {
            showListeners.add(callback);
            return () => showListeners.delete(callback);
          },
        },
        dedupeKey: options.dedupeKey,
        onListenerError: (error) => errors.push(error),
      };
      const client = createStreamClient(env);
      return {
        id,
        client,
        sources,
        errors,
        source: () => sources.filter((source) => !source.closed).at(-1),
        hide: () => hideListeners.forEach((callback) => callback()),
        show: () => showListeners.forEach((callback) => callback()),
        kill: () => {
          for (const source of sources) source.close();
          clock.cancelOwner(id);
          for (const channel of hub.channels) if (channel.tab === id) channel.closed = true;
          locks.drop(id);
        },
      };
    },
  };
  return world;
}

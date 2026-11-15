// The live stream client (backend feature 27, plan §5): one EventSource per browser, shared by its tabs. It is pure: every browser API comes in through `StreamEnv`,
// so the rules are tested with fakes. The tab that holds the Web Lock is the leader: it opens the stream and repeats every event on a BroadcastChannel; the others listen.
import {
  BACKOFF_BASE_MS,
  BACKOFF_JITTER,
  BACKOFF_MAX_MS,
  MIN_REFUSAL_WAIT_MS,
  PROBE_TIMEOUT_MS,
  REFUSALS_BEFORE_LONG_WAIT,
  SEEN_LIMIT,
  WATCHDOG_MS,
  type ChannelLike,
  type EventSourceLike,
  type ProbeResult,
  type StreamClient,
  type StreamEnv,
  type StreamListener,
  type StreamMessage,
  type StreamStatus,
} from './streamEnv';

/** Events the client always listens to: it needs them itself, whoever subscribed. Others are attached when someone subscribes. */
const CONTROL_EVENTS = ['ready', 'hb', 'resync', 'bye'] as const;
/** Statuses a leader announces to the other tabs. */
const ANNOUNCED: readonly StreamStatus[] = ['connecting', 'open', 'retrying'];
/** Guards against a nonsense `want` message: it is same-origin, but costs nothing to bound. */
const MAX_WANTED_NAMES = 64;
const MAX_NAME_LENGTH = 80;

type Role = 'none' | 'follower' | 'leader';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const textOrNull = (value: unknown): string | null => (isText(value) && value !== '' ? value : null);

/** Reads the JSON of a frame; a frame that is not JSON is ignored (it still proves the connection is alive). */
function parseFrame(raw: unknown): { ok: true; value: unknown } | { ok: false } {
  if (!isText(raw)) return { ok: true, value: raw };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Makes a stream client. Nothing happens until `start()`. See `StreamClient` for the public contract.
 *
 * Rules (plan §5): one stream per browser (Web Locks leader, BroadcastChannel relay, hand-over with the last cursor); on a failure close and
 * reopen after 5 s doubling to 60 s with a random spread of plus or minus 20 %, reset by a `ready`; a 45 s watchdog; after a failed connect ask the
 * plain route why (401 or 403 stop for good, 429 waits `Retry-After` and at least 60 s, 200 means the stream was refused and backs off, from the
 * third refusal in a row at least 60 s); an inbox item is handled once however often it arrives.
 */
export function createStreamClient(env: StreamEnv): StreamClient {
  const { timers } = env;
  const listeners = new Map<string, Set<StreamListener>>();
  const statusListeners = new Set<() => void>();
  /** Keys of the events already handled (insertion order, bounded). */
  const seen = new Set<string>();
  /** Event names other tabs listen to; the leader attaches them too so it can pass them on. */
  const remoteNames = new Set<string>();

  let status: StreamStatus = 'idle';
  let running = false;
  /** The page is hidden or frozen: nothing is held, the tab rejoins on `show`. */
  let suspended = false;
  let role: Role = 'none';
  let lastCursor: string | null = null;
  /** This tab has seen the stream live before, so the next `ready` is a reconnect. */
  let everLive = false;

  let lockAbort: AbortController | null = null;
  let releaseLock: (() => void) | null = null;
  let channel: ChannelLike | null = null;
  let lifecycleOff: (() => void)[] = [];

  // The leader's connection.
  let source: EventSourceLike | null = null;
  let removers: (() => void)[] = [];
  const attachedNames = new Set<string>();
  let sawReady = false;
  /** Failures in a row, the exponent of the back-off. */
  let attempt = 0;
  /** Connects in a row the server answered 200 on the plain route after refusing the stream. */
  let refusals = 0;
  let retryTimer: unknown = null;
  let watchdogTimer: unknown = null;
  let probeTimer: unknown = null;
  let probeToken = 0;

  // ---- status ----

  function post(message: Record<string, unknown>): void {
    try {
      channel?.postMessage(message);
    } catch {
      // A closed channel: this tab is leaving anyway.
    }
  }

  function announceState(): void {
    if (role === 'leader' && ANNOUNCED.includes(status)) post({ t: 'state', status, cursor: lastCursor });
  }

  function setStatus(next: StreamStatus, announce = true): void {
    if (next === status) return;
    status = next;
    if (announce) announceState();
    for (const listener of [...statusListeners]) listener();
  }

  // ---- events ----

  function emit(
    name: string,
    data: unknown,
    cursor: string | null,
    refetch: boolean,
    relayed: boolean,
  ): void {
    const set = listeners.get(name);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        listener(data, { cursor, refetch, relayed });
      } catch (error) {
        env.onListenerError?.(error);
      }
    }
  }

  /** Hands one event to this tab's subscribers. A duplicate (same key) is dropped and answers false, so it is not passed on either. */
  function deliver(name: string, data: unknown, cursor: string | null, relayed: boolean): boolean {
    const key = env.dedupeKey?.(name, data);
    if (key !== undefined) {
      if (seen.has(key)) return false;
      seen.add(key);
      if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string);
    }
    if (cursor) lastCursor = cursor;
    let refetch = false;
    if (name === 'ready') {
      refetch = everLive || (isRecord(data) && data.resumed === true);
      everLive = true;
    } else if (name === 'resync') {
      refetch = true;
    }
    emit(name, data, cursor, refetch, relayed);
    return true;
  }

  // ---- the leader's connection ----

  function clearRetry(): void {
    if (retryTimer !== null) timers.clearTimeout(retryTimer);
    retryTimer = null;
  }

  function clearWatchdog(): void {
    if (watchdogTimer !== null) timers.clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  function clearProbe(): void {
    probeToken += 1;
    if (probeTimer !== null) timers.clearTimeout(probeTimer);
    probeTimer = null;
  }

  function closeSource(): void {
    clearWatchdog();
    for (const remove of removers) remove();
    removers = [];
    attachedNames.clear();
    const current = source;
    source = null;
    current?.close();
  }

  /** The pause before the next try: 5 s, 10 s, 20 s … up to 60 s, spread by plus or minus 20 %. `floorMs` raises it (after repeated refusals). */
  function backoffDelay(floorMs = 0): number {
    const base = Math.max(floorMs, Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attempt));
    attempt += 1;
    return Math.round(base * (1 + (env.random() * 2 - 1) * BACKOFF_JITTER));
  }

  function scheduleReconnect(delayMs: number): void {
    closeSource();
    clearRetry();
    setStatus('retrying');
    retryTimer = timers.setTimeout(() => {
      retryTimer = null;
      connect();
    }, delayMs);
  }

  function armWatchdog(): void {
    clearWatchdog();
    watchdogTimer = timers.setTimeout(() => {
      watchdogTimer = null;
      if (source) onFailure();
    }, WATCHDOG_MS);
  }

  /** The connection failed or went silent. A stream that had said `ready` just drops: back off and reopen. One that never did is asked about first. */
  function onFailure(): void {
    const hadReady = sawReady;
    closeSource();
    if (hadReady) scheduleReconnect(backoffDelay());
    else probeThenRetry();
  }

  /** Asks the plain route why the connect failed, then decides what the answer means. A probe that does not answer in time counts as no answer. */
  function probeThenRetry(): void {
    setStatus('retrying');
    clearRetry();
    clearProbe();
    const token = probeToken;
    let settled = false;
    const finish = (result: ProbeResult): void => {
      if (settled) return;
      settled = true;
      if (probeTimer !== null) timers.clearTimeout(probeTimer);
      probeTimer = null;
      if (token !== probeToken || !running || suspended || role !== 'leader') return;
      decide(result);
    };
    probeTimer = timers.setTimeout(() => finish({ status: 0 }), PROBE_TIMEOUT_MS);
    try {
      env.probe().then(finish, () => finish({ status: 0 }));
    } catch {
      finish({ status: 0 });
    }
  }

  function decide({ status: code, retryAfterSeconds }: ProbeResult): void {
    if (code === 401 || code === 403) {
      // The session is gone: stop for good. The sign-out rules of the app (the polling calls get the same answer) do the rest.
      halt('refused');
      return;
    }
    if (code === 429) {
      const asked = Number.isFinite(retryAfterSeconds) ? (retryAfterSeconds ?? 0) * 1000 : 0;
      scheduleReconnect(Math.max(MIN_REFUSAL_WAIT_MS, asked));
      return;
    }
    if (code >= 200 && code < 300) {
      // The route answers but the stream did not: a cap, the kill switch or a restart.
      refusals += 1;
      scheduleReconnect(backoffDelay(refusals >= REFUSALS_BEFORE_LONG_WAIT ? MIN_REFUSAL_WAIT_MS : 0));
      return;
    }
    scheduleReconnect(backoffDelay());
  }

  function onReady(): void {
    sawReady = true;
    attempt = 0;
    refusals = 0;
  }

  function onSourceEvent(es: EventSourceLike, name: string, event: StreamMessage): void {
    if (es !== source) return;
    armWatchdog();
    const frame = parseFrame(event.data);
    if (!frame.ok) return;
    const cursor = textOrNull(event.lastEventId);
    if (name === 'ready') {
      onReady();
      // Local first, without telling the other tabs yet: they must see the `ready` event before they see the status `open`.
      setStatus('open', false);
    }
    const fresh = deliver(name, frame.value, cursor, false);
    if (fresh && name !== 'hb') post({ t: 'ev', name, data: frame.value, cursor });
    if (name === 'ready') announceState();
    // The server ends the stream on purpose: reopen like after any drop.
    if (name === 'bye') onFailure();
  }

  function attach(es: EventSourceLike, name: string): void {
    if (attachedNames.has(name)) return;
    attachedNames.add(name);
    const handler = (event: StreamMessage): void => onSourceEvent(es, name, event);
    es.addEventListener(name, handler);
    removers.push(() => es.removeEventListener(name, handler));
  }

  function attachWanted(es: EventSourceLike): void {
    for (const name of CONTROL_EVENTS) attach(es, name);
    for (const name of listeners.keys()) attach(es, name);
    for (const name of remoteNames) attach(es, name);
  }

  function connect(): void {
    if (!running || suspended || role !== 'leader') return;
    closeSource();
    clearRetry();
    sawReady = false;
    setStatus('connecting');
    let es: EventSourceLike;
    try {
      es = env.createEventSource(env.streamUrl(lastCursor));
    } catch {
      scheduleReconnect(backoffDelay());
      return;
    }
    source = es;
    const onError = (): void => {
      if (es === source) onFailure();
    };
    const onOpen = (): void => {
      if (es === source) armWatchdog();
    };
    es.addEventListener('error', onError);
    es.addEventListener('open', onOpen);
    removers.push(
      () => es.removeEventListener('error', onError),
      () => es.removeEventListener('open', onOpen),
    );
    attachWanted(es);
    armWatchdog();
  }

  // ---- leader election and relay ----

  function becomeLeader(): void {
    role = 'leader';
    attempt = 0;
    refusals = 0;
    // The other tabs answer with the event names they listen to.
    post({ t: 'leader' });
    connect();
  }

  function closeChannel(): void {
    const current = channel;
    channel = null;
    if (!current) return;
    current.onmessage = null;
    try {
      current.close();
    } catch {
      // Already closed.
    }
  }

  /** One stream for this tab alone: the browser has no Web Locks or BroadcastChannel, or the lock request was refused. */
  function becomeSolo(): void {
    closeChannel();
    if (!running || suspended) return;
    role = 'leader';
    attempt = 0;
    refusals = 0;
    connect();
  }

  function requestLock(locks: NonNullable<StreamEnv['locks']>): void {
    const abort = new AbortController();
    lockAbort = abort;
    const stale = (): boolean => lockAbort !== abort || !running || suspended;
    try {
      locks
        .request(
          env.lockName,
          { mode: 'exclusive', signal: abort.signal },
          () =>
            new Promise<void>((resolve) => {
              if (stale()) {
                resolve();
                return;
              }
              releaseLock = resolve;
              becomeLeader();
            }),
        )
        .then(
          () => {
            // The lock ended while this tab still wants it (another tab stole it): go back to waiting.
            if (!stale() && role === 'leader') {
              closeSource();
              clearRetry();
              clearProbe();
              releaseLock = null;
              role = 'follower';
              setStatus('connecting');
              requestLock(locks);
            }
          },
          () => {
            if (!abort.signal.aborted && !stale()) becomeSolo();
          },
        );
    } catch {
      becomeSolo();
    }
  }

  function onChannelMessage(message: unknown): void {
    if (!isRecord(message) || !isText(message.t)) return;
    switch (message.t) {
      case 'ev':
        if (role === 'follower' && isText(message.name)) {
          deliver(message.name, message.data, textOrNull(message.cursor), true);
        }
        break;
      case 'state':
        if (role !== 'follower') break;
        if (isText(message.status) && ANNOUNCED.includes(message.status as StreamStatus)) {
          if (message.status === 'open') everLive = true;
          setStatus(message.status as StreamStatus);
        }
        if (textOrNull(message.cursor)) lastCursor = textOrNull(message.cursor);
        break;
      case 'want':
        if (role === 'leader' && Array.isArray(message.names)) {
          for (const name of message.names.slice(0, MAX_WANTED_NAMES)) {
            if (isText(name) && name.length <= MAX_NAME_LENGTH) remoteNames.add(name);
          }
          if (source) attachWanted(source);
          announceState();
        }
        break;
      case 'leader':
        if (role === 'follower') post({ t: 'want', names: [...listeners.keys()] });
        break;
    }
  }

  function join(): void {
    const { locks, createChannel } = env;
    if (!locks || !createChannel) {
      becomeSolo();
      return;
    }
    try {
      channel = createChannel(env.lockName);
      channel.onmessage = (event) => onChannelMessage(event.data);
    } catch {
      becomeSolo();
      return;
    }
    role = 'follower';
    post({ t: 'want', names: [...listeners.keys()] });
    requestLock(locks);
  }

  /** Lets go of everything this tab holds (the stream, the lock, the channel, the timers). The subscribers, the cursor and the dedupe memory stay. */
  function teardown(): void {
    clearRetry();
    clearProbe();
    closeSource();
    const abort = lockAbort;
    lockAbort = null;
    abort?.abort();
    const release = releaseLock;
    releaseLock = null;
    release?.();
    closeChannel();
    role = 'none';
    remoteNames.clear();
  }

  /** The page was hidden or frozen: step down so another tab takes the stream (a frozen tab cannot keep it alive). */
  function suspend(): void {
    if (!running || suspended) return;
    suspended = true;
    teardown();
    setStatus('retrying');
  }

  function resume(): void {
    if (!running || !suspended) return;
    suspended = false;
    setStatus('connecting');
    join();
  }

  /** Stops for good (a deliberate stop, or the server refused the session) and leaves the final status. */
  function halt(final: StreamStatus): void {
    running = false;
    suspended = false;
    for (const off of lifecycleOff) off();
    lifecycleOff = [];
    teardown();
    lastCursor = null;
    everLive = false;
    attempt = 0;
    refusals = 0;
    seen.clear();
    setStatus(final);
  }

  // ---- public ----

  function start(): void {
    if (running) return;
    running = true;
    suspended = false;
    attempt = 0;
    refusals = 0;
    setStatus('connecting');
    const { lifecycle } = env;
    if (lifecycle) lifecycleOff = [lifecycle.onHide(suspend), lifecycle.onShow(resume)];
    join();
  }

  function subscribe(name: string, listener: StreamListener): () => void {
    let set = listeners.get(name);
    const isNewName = !set;
    if (!set) {
      set = new Set();
      listeners.set(name, set);
    }
    set.add(listener);
    if (isNewName && running && !suspended) {
      if (role === 'leader' && source) attachWanted(source);
      else if (role === 'follower') post({ t: 'want', names: [...listeners.keys()] });
    }
    return () => {
      set.delete(listener);
      if (set.size === 0 && listeners.get(name) === set) listeners.delete(name);
    };
  }

  const onStatus = (listener: () => void): (() => void) => {
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  };

  return { start, stop: () => halt('idle'), subscribe, status: () => status, onStatus };
}

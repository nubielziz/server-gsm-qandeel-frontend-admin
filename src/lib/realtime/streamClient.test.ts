// Tests for the stream client's rules, with a hand-moved clock and fake EventSource, Web Lock, BroadcastChannel and probe: leader election, the hand-over with the
// last cursor, the back-off and its spread, the 45 s watchdog, the refusal probe (401 and 403 stop, 429 waits, 200 backs off), dedupe, and the generic subscribe API.
import { describe, expect, it } from 'vitest';
import { streamDedupeKey } from './events';
import type { StreamEventMeta, StreamStatus } from './streamEnv';
import { createStreamClient } from './streamClient';
import { createWorld, FakeEventSource, flush, type Tab } from './testing/streamFakes';

const READY = { v: 1, heartbeatMs: 15_000, resumed: false, serverTime: '2026-11-15T10:00:00.000Z' };
const RESUMED = { ...READY, resumed: true };

function createdItem(id: number, live = true) {
  return {
    item: {
      id,
      category: 'announcement',
      title: `Item ${id}`,
      body: 'Text',
      link: null,
      locale: 'en',
      readAt: null,
      createdAt: '2026-11-15T10:00:00.000Z',
      campaignId: null,
      event: null,
    },
    unread: id,
    live,
  };
}

/** A tab with the dedupe rule of the app. */
function solo(world: ReturnType<typeof createWorld>, id = 't') {
  return world.tab(id, { locks: false, channel: false, dedupeKey: streamDedupeKey });
}
function shared(world: ReturnType<typeof createWorld>, id: string) {
  return world.tab(id, { dedupeKey: streamDedupeKey });
}

/** Records every call of one event: `[data, meta]`. */
function record(tab: Tab, name: string) {
  const calls: [unknown, StreamEventMeta][] = [];
  tab.client.subscribe(name, (data, meta) => calls.push([data, meta]));
  return calls;
}

/** Opens the tab's stream and makes it say `ready`. */
async function open(tab: Tab, data: unknown = READY) {
  tab.client.start();
  await flush();
  tab.source()?.emit('ready', data);
  await flush();
}

describe('one tab on its own', () => {
  it('opens the stream, says connecting, then open on ready, and hands events to subscribers', async () => {
    const world = createWorld();
    const tab = solo(world);
    const statuses: StreamStatus[] = [];
    tab.client.onStatus(() => statuses.push(tab.client.status()));
    const created = record(tab, 'notification.created');
    expect(tab.client.status()).toBe('idle');
    tab.client.start();
    await flush();
    expect(tab.sources.map((source) => source.url)).toEqual(['/stream']);
    expect(tab.client.status()).toBe('connecting');
    tab.source()?.emit('ready', READY);
    tab.source()?.emit('notification.created', createdItem(5), 'i5');
    expect(tab.client.status()).toBe('open');
    expect(statuses).toEqual(['connecting', 'open']);
    expect(created).toHaveLength(1);
    expect(created[0][1]).toEqual({ cursor: 'i5', refetch: false, relayed: false });
    expect(created[0][0]).toMatchObject({ unread: 5 });
  });

  it('does nothing when started twice, and nothing before start', async () => {
    const world = createWorld();
    const tab = solo(world);
    await flush();
    expect(tab.sources).toHaveLength(0);
    tab.client.start();
    tab.client.start();
    await flush();
    expect(tab.sources).toHaveLength(1);
  });

  it('says refetch for a resync, for a ready that resumed, and for every ready after the first of the page load', async () => {
    const world = createWorld();
    const tab = solo(world);
    const ready = record(tab, 'ready');
    const resync = record(tab, 'resync');
    await open(tab);
    expect(ready.map(([, meta]) => meta.refetch)).toEqual([false]);
    tab.source()?.emit('resync', { topics: ['inbox'] });
    expect(resync.map(([, meta]) => meta.refetch)).toEqual([true]);
    // The stream drops and comes back: not the first ready of this page load.
    tab.source()?.fail();
    await world.clock.advance(6_000);
    tab.source()?.emit('ready', READY);
    expect(ready.map(([, meta]) => meta.refetch)).toEqual([false, true]);
  });

  it('refetches on the very first ready when the server says it resumed a cursor', async () => {
    const world = createWorld();
    const tab = solo(world);
    const ready = record(tab, 'ready');
    await open(tab, RESUMED);
    expect(ready.map(([, meta]) => meta.refetch)).toEqual([true]);
  });

  it('listens to any event name a feature subscribes to, before or after the stream is open, and stops when unsubscribed', async () => {
    const world = createWorld();
    const tab = solo(world);
    const early = record(tab, 'ticket.updated');
    tab.client.start();
    await flush();
    expect(tab.source()?.names()).toEqual(['bye', 'hb', 'ready', 'resync', 'ticket.updated']);
    const late: unknown[] = [];
    const stop = tab.client.subscribe('ticket.typing', (data) => late.push(data));
    expect(tab.source()?.names()).toContain('ticket.typing');
    tab.source()?.emit('ready', READY);
    tab.source()?.emit('ticket.typing', { id: 4 });
    tab.source()?.emit('ticket.updated', { id: 4 });
    stop();
    tab.source()?.emit('ticket.typing', { id: 5 });
    expect(late).toEqual([{ id: 4 }]);
    expect(early.map(([data]) => data)).toEqual([{ id: 4 }]);
  });

  it('keeps going when a subscriber throws, and reports it', async () => {
    const world = createWorld();
    const tab = solo(world);
    tab.client.subscribe('unread.changed', () => {
      throw new Error('boom');
    });
    const seen = record(tab, 'unread.changed');
    await open(tab);
    tab.source()?.emit('unread.changed', { unread: 3 });
    expect(seen).toHaveLength(1);
    expect(tab.errors).toHaveLength(1);
  });

  it('ignores a frame that is not JSON, and the garbage still counts as a sign of life', async () => {
    const world = createWorld();
    const tab = solo(world);
    const unread = record(tab, 'unread.changed');
    await open(tab);
    await world.clock.advance(40_000);
    tab.source()?.emit('unread.changed', '{not json');
    expect(unread).toHaveLength(0);
    await world.clock.advance(40_000);
    expect(tab.sources).toHaveLength(1);
    await world.clock.advance(5_000);
    expect(tab.sources[0].closed).toBe(true);
  });

  it('counts an inbox item once however often it arrives, and a repeat does not move the cursor', async () => {
    const world = createWorld();
    const tab = solo(world);
    const created = record(tab, 'notification.created');
    await open(tab);
    tab.source()?.emit('notification.created', createdItem(5), 'i5');
    tab.source()?.emit('notification.created', createdItem(6), 'i6');
    tab.source()?.emit('notification.created', createdItem(5, false), 'i5');
    tab.source()?.emit('notification.created', createdItem(5, false), 'i2');
    expect(created.map(([data]) => (data as { item: { id: number } }).item.id)).toEqual([5, 6]);
    tab.source()?.fail();
    await world.clock.advance(6_000);
    expect(tab.source()?.url).toBe('/stream?cursor=i6');
  });

  it('does not dedupe events that carry no key', async () => {
    const world = createWorld();
    const tab = solo(world);
    const unread = record(tab, 'unread.changed');
    await open(tab);
    tab.source()?.emit('unread.changed', { unread: 1 });
    tab.source()?.emit('unread.changed', { unread: 1 });
    expect(unread).toHaveLength(2);
  });

  it('reopens with the last cursor it saw, and not with a cursor after stop and start', async () => {
    const world = createWorld();
    const tab = solo(world);
    record(tab, 'notification.created');
    await open(tab);
    tab.source()?.emit('notification.created', createdItem(9), 'i9');
    tab.source()?.fail();
    await world.clock.advance(5_000);
    expect(tab.source()?.url).toBe('/stream?cursor=i9');
    tab.client.stop();
    tab.client.start();
    await flush();
    expect(tab.source()?.url).toBe('/stream');
  });

  it('stop closes the stream, clears every timer, says idle, and can start again', async () => {
    const world = createWorld();
    const tab = solo(world);
    await open(tab);
    tab.client.stop();
    expect(tab.sources[0].closed).toBe(true);
    expect(world.clock.pendingDelays('t')).toEqual([]);
    expect(tab.client.status()).toBe('idle');
    tab.client.start();
    await flush();
    expect(tab.sources).toHaveLength(2);
    expect(tab.client.status()).toBe('connecting');
  });

  it('retries when the EventSource cannot even be created', async () => {
    const world = createWorld();
    let attempts = 0;
    const client = createStreamClient({
      streamUrl: () => '/stream',
      createEventSource: () => {
        attempts += 1;
        if (attempts === 1) throw new SyntaxError('bad url');
        return new FakeEventSource('/stream', 'f');
      },
      lockName: 'x',
      timers: world.clock.forTab('f'),
      random: () => 0.5,
      probe: () => Promise.resolve({ status: 200 }),
    });
    client.start();
    expect(client.status()).toBe('retrying');
    expect(world.clock.pendingDelays('f')).toEqual([5_000]);
    await world.clock.advance(5_000);
    expect(attempts).toBe(2);
    expect(client.status()).toBe('connecting');
  });
});

describe('the back-off', () => {
  it('waits 5 s, 10 s, 20 s, 40 s and then 60 s, and stays at 60 s', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 503 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    const waits: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      tab.source()?.fail();
      await flush();
      const [wait] = world.clock.pendingDelays('t');
      waits.push(wait);
      await world.clock.advance(wait);
    }
    expect(waits).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
  });

  it('spreads each wait by plus or minus 20 %', async () => {
    for (const [random, expected] of [
      [0, 4_000],
      [0.5, 5_000],
      [0.999999, 6_000],
    ] as const) {
      const world = createWorld();
      world.random = random;
      world.probeResults = [{ status: 503 }];
      const tab = solo(world);
      tab.client.start();
      await flush();
      tab.source()?.fail();
      await flush();
      expect(world.clock.pendingDelays('t')).toEqual([expected]);
    }
  });

  it('starts again at 5 s after a ready', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 503 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    for (const wait of [5_000, 10_000, 20_000]) {
      tab.source()?.fail();
      await flush();
      expect(world.clock.pendingDelays('t')).toEqual([wait]);
      await world.clock.advance(wait);
    }
    tab.source()?.emit('ready', READY);
    tab.source()?.fail();
    await flush();
    expect(world.clock.pendingDelays('t')).toEqual([5_000]);
  });

  it('does not ask the probe when a stream that was open drops: it just backs off', async () => {
    const world = createWorld();
    const tab = solo(world);
    await open(tab);
    tab.source()?.fail();
    await flush();
    expect(world.probeCalls).toBe(0);
    expect(world.clock.pendingDelays('t')).toEqual([5_000]);
    expect(tab.client.status()).toBe('retrying');
  });

  it('closes the old source before it opens the next one', async () => {
    const world = createWorld();
    const tab = solo(world);
    await open(tab);
    tab.source()?.fail();
    expect(tab.sources[0].closed).toBe(true);
    await world.clock.advance(5_000);
    expect(tab.sources).toHaveLength(2);
    expect(tab.sources[1].closed).toBe(false);
  });
});

describe('the watchdog', () => {
  it('reconnects when nothing, not even a heartbeat, arrived for 45 s', async () => {
    const world = createWorld();
    const tab = solo(world);
    await open(tab);
    await world.clock.advance(44_999);
    expect(tab.sources[0].closed).toBe(false);
    await world.clock.advance(1);
    expect(tab.sources[0].closed).toBe(true);
    expect(tab.client.status()).toBe('retrying');
    await world.clock.advance(5_000);
    expect(tab.sources).toHaveLength(2);
  });

  it('is pushed back by every heartbeat', async () => {
    const world = createWorld();
    const tab = solo(world);
    await open(tab);
    for (let i = 0; i < 6; i += 1) {
      await world.clock.advance(15_000);
      tab.source()?.emit('hb', 1_731_672_000 + i);
    }
    expect(tab.sources).toHaveLength(1);
    expect(tab.sources[0].closed).toBe(false);
  });

  it('also covers a connection that never says ready: the probe decides', async () => {
    const world = createWorld();
    const tab = solo(world);
    tab.client.start();
    await flush();
    await world.clock.advance(45_000);
    expect(tab.sources[0].closed).toBe(true);
    expect(world.probeCalls).toBe(1);
  });
});

describe('the refusal probe', () => {
  it('asks the plain route after an error before any ready', async () => {
    const world = createWorld();
    const tab = solo(world);
    tab.client.start();
    await flush();
    tab.source()?.fail();
    expect(tab.client.status()).toBe('retrying');
    await flush();
    expect(world.probeCalls).toBe(1);
  });

  it.each([401, 403])('stops for good on %i: no new stream, status refused, no timers', async (code) => {
    const world = createWorld();
    world.probeResults = [{ status: code }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    tab.source()?.fail();
    await flush();
    expect(tab.client.status()).toBe('refused');
    expect(world.clock.pendingDelays('t')).toEqual([]);
    await world.clock.advance(10 * 60_000);
    expect(tab.sources).toHaveLength(1);
    expect(world.probeCalls).toBe(1);
  });

  it('on 429 waits what Retry-After says, but at least 60 s', async () => {
    for (const [answer, wait] of [
      [{ status: 429, retryAfterSeconds: 120 }, 120_000],
      [{ status: 429, retryAfterSeconds: 10 }, 60_000],
      [{ status: 429 }, 60_000],
    ] as const) {
      const world = createWorld();
      world.probeResults = [answer];
      const tab = solo(world);
      tab.client.start();
      await flush();
      tab.source()?.fail();
      await flush();
      expect(world.clock.pendingDelays('t')).toEqual([wait]);
      await world.clock.advance(wait - 1);
      expect(tab.sources).toHaveLength(1);
      await world.clock.advance(1);
      expect(tab.sources).toHaveLength(2);
    }
  });

  it('does not count a 429 wait in the back-off: the next plain failure waits 5 s', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 429 }, { status: 503 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    tab.source()?.fail();
    await flush();
    await world.clock.advance(60_000);
    tab.source()?.fail();
    await flush();
    expect(world.clock.pendingDelays('t')).toEqual([5_000]);
  });

  it('on 200 backs off 5 s, 10 s, and from the third refusal in a row waits at least 60 s', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 200 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    const waits: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      tab.source()?.fail();
      await flush();
      const [wait] = world.clock.pendingDelays('t');
      waits.push(wait);
      await world.clock.advance(wait);
    }
    expect(waits).toEqual([5_000, 10_000, 60_000, 60_000, 60_000]);
  });

  it('forgets the refusals after a ready', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 200 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    for (let i = 0; i < 2; i += 1) {
      tab.source()?.fail();
      await flush();
      await world.clock.advance(world.clock.pendingDelays('t')[0]);
    }
    tab.source()?.emit('ready', READY);
    tab.source()?.fail();
    await flush();
    await world.clock.advance(5_000);
    tab.source()?.fail();
    await flush();
    expect(world.clock.pendingDelays('t')).toEqual([10_000]);
  });

  it('treats a failed probe and a probe that never answers as no answer: the plain back-off', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 0 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    tab.source()?.fail();
    await flush();
    expect(world.clock.pendingDelays('t')).toEqual([5_000]);

    const hung = createWorld();
    hung.probeHangs = true;
    const other = solo(hung);
    other.client.start();
    await flush();
    other.source()?.fail();
    await flush();
    expect(hung.clock.pendingDelays('t')).toEqual([15_000]);
    await hung.clock.advance(15_000);
    expect(hung.clock.pendingDelays('t')).toEqual([5_000]);
  });

  it('ignores a probe answer that arrives after stop', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 401 }];
    const tab = solo(world);
    tab.client.start();
    await flush();
    tab.source()?.fail();
    tab.client.stop();
    await flush();
    expect(tab.client.status()).toBe('idle');
  });
});

describe('what the server says on purpose', () => {
  it('reopens after bye (5 s) and tells the subscribers why', async () => {
    const world = createWorld();
    const tab = solo(world);
    const bye = record(tab, 'bye');
    await open(tab);
    tab.source()?.emit('bye', { reason: 'max_age' });
    expect(bye.map(([data]) => data)).toEqual([{ reason: 'max_age' }]);
    expect(tab.sources[0].closed).toBe(true);
    expect(world.probeCalls).toBe(0);
    expect(world.clock.pendingDelays('t')).toEqual([5_000]);
    await world.clock.advance(5_000);
    expect(tab.sources).toHaveLength(2);
  });
});

describe('page lifecycle', () => {
  it('lets go when the page is hidden or frozen and comes back, with the cursor, when it is shown', async () => {
    const world = createWorld();
    const tab = solo(world);
    record(tab, 'notification.created');
    await open(tab);
    tab.source()?.emit('notification.created', createdItem(3), 'i3');
    tab.hide();
    expect(tab.sources[0].closed).toBe(true);
    expect(world.clock.pendingDelays('t')).toEqual([]);
    expect(tab.client.status()).toBe('retrying');
    tab.show();
    await flush();
    expect(tab.source()?.url).toBe('/stream?cursor=i3');
    expect(tab.client.status()).toBe('connecting');
  });

  it('does nothing on show when it was not hidden, and nothing after stop', async () => {
    const world = createWorld();
    const tab = solo(world);
    await open(tab);
    tab.show();
    await flush();
    expect(tab.sources).toHaveLength(1);
    tab.client.stop();
    tab.show();
    await flush();
    expect(tab.sources).toHaveLength(1);
  });
});

describe('one stream for the tabs of a browser', () => {
  it('opens one stream: the tab that holds the lock leads and the other follows', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    a.client.start();
    b.client.start();
    await flush();
    expect(world.locks.heldBy()).toBe('a');
    expect(a.sources).toHaveLength(1);
    expect(b.sources).toHaveLength(0);
    expect(b.client.status()).toBe('connecting');
  });

  it('passes every event on to the follower, which sees it as relayed, and mirrors the status', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const aCreated = record(a, 'notification.created');
    const bCreated = record(b, 'notification.created');
    const bReady = record(b, 'ready');
    a.client.start();
    b.client.start();
    await flush();
    a.source()?.emit('ready', READY);
    await flush();
    expect(a.client.status()).toBe('open');
    expect(b.client.status()).toBe('open');
    a.source()?.emit('notification.created', createdItem(5), 'i5');
    await flush();
    expect(aCreated[0][1]).toEqual({ cursor: 'i5', refetch: false, relayed: false });
    expect(bCreated[0][1]).toEqual({ cursor: 'i5', refetch: false, relayed: true });
    // The first ready of the page load is not a reconnect, in the follower too.
    expect(bReady.map(([, meta]) => meta.refetch)).toEqual([false]);
    a.source()?.fail();
    await flush();
    expect(b.client.status()).toBe('retrying');
  });

  it('does not repeat heartbeats to the follower', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const bBeat = record(b, 'hb');
    await open(a);
    b.client.start();
    await flush();
    a.source()?.emit('hb', 1_731_672_000);
    await flush();
    expect(bBeat).toHaveLength(0);
  });

  it('tells a tab that joins late that the stream is open, and gives it the cursor', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    record(a, 'notification.created');
    await open(a);
    a.source()?.emit('notification.created', createdItem(7), 'i7');
    const b = shared(world, 'b');
    const bReady = record(b, 'ready');
    b.client.start();
    await flush();
    expect(b.client.status()).toBe('open');
    // It joined a live stream: the next ready it sees is a reconnect.
    a.source()?.fail();
    await world.clock.advance(5_000);
    a.source()?.emit('ready', READY);
    await flush();
    expect(bReady.map(([, meta]) => meta.refetch)).toEqual([true]);
    a.kill();
    await flush();
    expect(b.source()?.url).toBe('/stream?cursor=i7');
  });

  it('hands the stream over with the last cursor when the leader closes, and ignores what is replayed', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const bCreated = record(b, 'notification.created');
    const bReady = record(b, 'ready');
    a.client.start();
    b.client.start();
    await flush();
    a.source()?.emit('ready', READY);
    a.source()?.emit('notification.created', createdItem(5), 'i5');
    a.source()?.emit('notification.created', createdItem(6), 'i6');
    await flush();
    a.kill();
    await flush();
    expect(world.locks.heldBy()).toBe('b');
    expect(b.sources).toHaveLength(1);
    expect(b.source()?.url).toBe('/stream?cursor=i6');
    expect(b.client.status()).toBe('connecting');
    // The server replays what came after the cursor (and, by a race, one the old leader already passed on).
    b.source()?.emit('ready', RESUMED);
    b.source()?.emit('notification.created', createdItem(6, false), 'i6');
    b.source()?.emit('notification.created', createdItem(7, false), 'i7');
    expect(bCreated.map(([data]) => (data as { item: { id: number } }).item.id)).toEqual([5, 6, 7]);
    expect(bReady.map(([, meta]) => meta.refetch)).toEqual([false, true]);
    expect(b.client.status()).toBe('open');
  });

  it('refetches on the first ready of a tab that took over, even without resumed', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const bReady = record(b, 'ready');
    a.client.start();
    b.client.start();
    await flush();
    a.source()?.emit('ready', READY);
    await flush();
    a.kill();
    await flush();
    b.source()?.emit('ready', READY);
    expect(bReady.map(([, meta]) => meta.refetch)).toEqual([false, true]);
  });

  it('passes the stream on when the page is hidden or frozen, and rejoins as a follower when it is shown', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    record(a, 'notification.created');
    record(b, 'notification.created');
    a.client.start();
    b.client.start();
    await flush();
    a.source()?.emit('ready', READY);
    a.source()?.emit('notification.created', createdItem(2), 'i2');
    await flush();
    a.hide();
    await flush();
    expect(a.sources[0].closed).toBe(true);
    expect(world.locks.heldBy()).toBe('b');
    expect(b.source()?.url).toBe('/stream?cursor=i2');
    a.show();
    await flush();
    expect(a.sources).toHaveLength(1);
    b.source()?.emit('ready', RESUMED);
    await flush();
    expect(a.client.status()).toBe('open');
    const aCreated = record(a, 'notification.created');
    b.source()?.emit('notification.created', createdItem(3), 'i3');
    await flush();
    expect(aCreated).toHaveLength(1);
  });

  it('goes back to waiting when the lock is taken from the leader, and the next tab leads', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    a.client.start();
    b.client.start();
    await flush();
    a.source()?.emit('ready', READY);
    await flush();
    world.locks.revoke();
    await flush();
    expect(a.sources[0].closed).toBe(true);
    expect(world.locks.heldBy()).toBe('b');
    expect(b.sources).toHaveLength(1);
    expect(a.sources).toHaveLength(1);
    b.source()?.emit('ready', READY);
    await flush();
    expect(a.client.status()).toBe('open');
  });

  it('passes resync and bye on to the follower too', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const resync = record(b, 'resync');
    const bye = record(b, 'bye');
    await open(a);
    b.client.start();
    await flush();
    a.source()?.emit('resync', { topics: ['inbox'] });
    a.source()?.emit('bye', { reason: 'shutdown' });
    await flush();
    expect(resync.map(([data, meta]) => [data, meta.refetch])).toEqual([[{ topics: ['inbox'] }, true]]);
    expect(bye.map(([data]) => data)).toEqual([{ reason: 'shutdown' }]);
  });

  it('hands the stream over when the leader stops (sign-out) too', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    a.client.start();
    b.client.start();
    await flush();
    a.client.stop();
    await flush();
    expect(world.locks.heldBy()).toBe('b');
    expect(b.sources).toHaveLength(1);
  });

  it('opens an event name only one tab listens to: a follower can subscribe to a name the leader does not use', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const c = shared(world, 'c');
    record(a, 'ready');
    const bTyping = record(b, 'ticket.typing');
    a.client.start();
    b.client.start();
    c.client.start();
    await flush();
    expect(a.source()?.names()).toContain('ticket.typing');
    // A name subscribed after the start reaches the leader too.
    const cUpdated = record(c, 'ticket.updated');
    await flush();
    expect(a.source()?.names()).toContain('ticket.updated');
    a.source()?.emit('ready', READY);
    a.source()?.emit('ticket.typing', { ticket: 4 });
    a.source()?.emit('ticket.updated', { ticket: 4 });
    await flush();
    expect(bTyping.map(([data]) => data)).toEqual([{ ticket: 4 }]);
    expect(cUpdated.map(([data]) => data)).toEqual([{ ticket: 4 }]);
    // After a hand-over the new leader learns the names again.
    a.kill();
    await flush();
    expect(b.source()?.names()).toContain('ticket.updated');
  });

  it('gives each tab its own stream without Web Locks, or without a BroadcastChannel', async () => {
    for (const options of [{ locks: false }, { channel: false }]) {
      const world = createWorld();
      const a = world.tab('a', options);
      const b = world.tab('b', options);
      a.client.start();
      b.client.start();
      await flush();
      expect(a.sources).toHaveLength(1);
      expect(b.sources).toHaveLength(1);
    }
  });

  it('falls back to a stream of its own when the browser refuses the lock request', async () => {
    const world = createWorld();
    world.locks.refuseWith = Object.assign(new Error('Locks are not allowed here.'), {
      name: 'SecurityError',
    });
    const tab = shared(world, 'a');
    tab.client.start();
    await flush();
    expect(tab.sources).toHaveLength(1);
    expect(tab.client.status()).toBe('connecting');
  });

  it('stops every tab for good on 401: each leader that takes over is refused in turn', async () => {
    const world = createWorld();
    world.probeResults = [{ status: 401 }];
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    a.client.start();
    b.client.start();
    await flush();
    a.source()?.fail();
    await flush();
    expect(a.client.status()).toBe('refused');
    expect(b.sources).toHaveLength(1);
    b.source()?.fail();
    await flush();
    expect(b.client.status()).toBe('refused');
    expect(world.locks.heldBy()).toBeNull();
    expect(world.probeCalls).toBe(2);
  });

  it('a follower that stops leaves the leader alone', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    a.client.start();
    b.client.start();
    await flush();
    b.client.stop();
    await flush();
    expect(world.locks.heldBy()).toBe('a');
    expect(a.sources[0].closed).toBe(false);
  });

  it('ignores channel messages that are not ours, whatever they hold', async () => {
    const world = createWorld();
    const a = shared(world, 'a');
    const b = shared(world, 'b');
    const bCreated = record(b, 'notification.created');
    a.client.start();
    b.client.start();
    await flush();
    for (const nonsense of [
      null,
      'text',
      7,
      [],
      {},
      { t: 3 },
      { t: 'ev' },
      { t: 'ev', name: 4 },
      { t: 'state', status: 'idle' },
      { t: 'want', names: 'x' },
      { t: 'zzz' },
    ]) {
      world.broadcastRaw(nonsense);
    }
    await flush();
    a.source()?.emit('ready', READY);
    a.source()?.emit('notification.created', createdItem(1), 'i1');
    await flush();
    expect(bCreated).toHaveLength(1);
    expect(b.client.status()).toBe('open');
  });
});

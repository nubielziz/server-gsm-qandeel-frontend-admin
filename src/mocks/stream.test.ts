// Tests for the mock staff stream: it opens and says ready, beats, takes pushed events only while open, fails on demand, closes, and installs itself as `EventSource`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  failMockStreams,
  installMockEventSource,
  MockEventSource,
  openMockStreamCount,
  pushMockStreamEvent,
  resetMockStreams,
  uninstallMockEventSource,
} from './stream';

beforeEach(() => {
  MockEventSource.readyDelayMs = 20;
  MockEventSource.heartbeatMs = 0;
  vi.useFakeTimers();
});
afterEach(() => {
  resetMockStreams();
  uninstallMockEventSource();
  vi.useRealTimers();
  MockEventSource.heartbeatMs = 15_000;
});

describe('MockEventSource', () => {
  it('opens after its delay and says ready, then takes pushed events as JSON with their id', () => {
    const source = new MockEventSource('/admin/stream');
    const seen: [string, string, string][] = [];
    for (const name of ['open', 'ready', 'unread.changed']) {
      source.addEventListener(name, (event) =>
        seen.push([name, String(event.data ?? ''), event.lastEventId ?? '']),
      );
    }
    expect(openMockStreamCount()).toBe(0);
    pushMockStreamEvent('unread.changed', { unread: 1 });
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(20);
    expect(openMockStreamCount()).toBe(1);
    expect(seen.map(([name]) => name)).toEqual(['open', 'ready']);
    expect(JSON.parse(seen[1][1])).toMatchObject({ v: 1, resumed: false });
    pushMockStreamEvent('unread.changed', { unread: 7 }, 'i7');
    expect(seen[2]).toEqual(['unread.changed', '{"unread":7}', 'i7']);
  });

  it('beats like the server so the client watchdog stays quiet', () => {
    MockEventSource.heartbeatMs = 15_000;
    const source = new MockEventSource('/admin/stream');
    const beats: string[] = [];
    source.addEventListener('hb', (event) => beats.push(String(event.data)));
    vi.advanceTimersByTime(20 + 45_000);
    expect(beats).toHaveLength(3);
  });

  it('stops listening for a removed listener, and takes nothing after close', () => {
    const source = new MockEventSource('/admin/stream');
    const seen: string[] = [];
    const listener = (event: { data?: unknown }) => seen.push(String(event.data));
    source.addEventListener('x', listener);
    vi.advanceTimersByTime(20);
    pushMockStreamEvent('x', 1);
    source.removeEventListener('x', listener);
    pushMockStreamEvent('x', 2);
    expect(seen).toEqual(['1']);
    source.close();
    expect(openMockStreamCount()).toBe(0);
    expect(source.readyState).toBe(2);
  });

  it('fails every stream on demand with an error event', () => {
    const source = new MockEventSource('/admin/stream');
    const errors = vi.fn();
    source.addEventListener('error', errors);
    vi.advanceTimersByTime(20);
    failMockStreams();
    expect(errors).toHaveBeenCalledTimes(1);
  });
});

describe('installing', () => {
  it('replaces EventSource, says so for the browser glue, and puts the old one back', () => {
    const before = globalThis.EventSource;
    installMockEventSource();
    expect(globalThis.EventSource).toBe(MockEventSource);
    installMockEventSource();
    uninstallMockEventSource();
    expect(globalThis.EventSource).toBe(before);
    expect((MockEventSource as { isMockEventSource?: boolean }).isMockEventSource).toBe(true);
  });
});

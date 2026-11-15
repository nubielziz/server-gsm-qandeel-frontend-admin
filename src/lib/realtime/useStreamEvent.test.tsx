// Tests for the stream hooks with a hand-made client behind the context: an event arrives parsed and typed, a malformed frame is skipped, any other name
// arrives as it is, the latest handler is used, the subscription ends on unmount, `useStreamRefetch` asks for a refetch only when it should, and the status.
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StreamContext } from './streamContext';
import type { StreamClient, StreamEventMeta, StreamListener, StreamStatus } from './streamEnv';
import { useStreamEvent, useStreamOpen, useStreamRefetch, useStreamStatus } from './useStreamEvent';

/** A client that does nothing but remember its subscribers, so a test can fire events by hand. */
function fakeClient() {
  const listeners = new Map<string, Set<StreamListener>>();
  const statusListeners = new Set<() => void>();
  let status: StreamStatus = 'idle';
  const client: StreamClient = {
    start: () => {},
    stop: () => {},
    subscribe: (name, listener) => {
      const set = listeners.get(name) ?? new Set();
      set.add(listener);
      listeners.set(name, set);
      return () => set.delete(listener);
    },
    status: () => status,
    onStatus: (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
  };
  return {
    client,
    fire(name: string, data: unknown, meta: Partial<StreamEventMeta> = {}) {
      for (const listener of [...(listeners.get(name) ?? [])]) {
        listener(data, { cursor: null, refetch: false, relayed: false, ...meta });
      }
    },
    count: (name: string) => listeners.get(name)?.size ?? 0,
    setStatus(next: StreamStatus) {
      status = next;
      statusListeners.forEach((listener) => listener());
    },
  };
}

function wrap(client: StreamClient | null, children: React.ReactNode) {
  return <StreamContext.Provider value={client}>{children}</StreamContext.Provider>;
}

describe('useStreamEvent', () => {
  it('hands a known event to the handler parsed, and skips a frame with the wrong shape', () => {
    const fake = fakeClient();
    const seen: number[] = [];
    function Probe() {
      useStreamEvent('unread.changed', ({ unread }) => seen.push(unread));
      return null;
    }
    render(wrap(fake.client, <Probe />));
    fake.fire('unread.changed', { unread: 4 });
    fake.fire('unread.changed', { unread: 'four' });
    fake.fire('unread.changed', null);
    expect(seen).toEqual([4]);
  });

  it('hands any other event name over as it came, with the meta', () => {
    const fake = fakeClient();
    const seen: [unknown, StreamEventMeta][] = [];
    function Probe() {
      useStreamEvent('ticket.updated', (data, meta) => seen.push([data, meta]));
      return null;
    }
    render(wrap(fake.client, <Probe />));
    fake.fire('ticket.updated', { id: 9 }, { cursor: 't5', relayed: true });
    expect(seen).toEqual([[{ id: 9 }, { cursor: 't5', refetch: false, relayed: true }]]);
  });

  it('always calls the latest handler without subscribing again, and stops on unmount', () => {
    const fake = fakeClient();
    const calls: string[] = [];
    function Probe({ label }: { label: string }) {
      useStreamEvent('unread.changed', () => calls.push(label));
      return null;
    }
    const view = render(wrap(fake.client, <Probe label="first" />));
    view.rerender(wrap(fake.client, <Probe label="second" />));
    expect(fake.count('unread.changed')).toBe(1);
    fake.fire('unread.changed', { unread: 1 });
    expect(calls).toEqual(['second']);
    view.unmount();
    expect(fake.count('unread.changed')).toBe(0);
  });

  it('does nothing without a provider', () => {
    const handler = vi.fn();
    function Probe() {
      useStreamEvent('unread.changed', handler);
      return <p>{useStreamStatus()}</p>;
    }
    render(<Probe />);
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useStreamRefetch', () => {
  it('asks only for a resync and for a ready that says refetch', () => {
    const fake = fakeClient();
    const refetch = vi.fn();
    function Probe() {
      useStreamRefetch(refetch);
      return null;
    }
    render(wrap(fake.client, <Probe />));
    const ready = { v: 1, heartbeatMs: 15000, resumed: false, serverTime: 'x' };
    fake.fire('ready', ready, { refetch: false });
    expect(refetch).not.toHaveBeenCalled();
    fake.fire('ready', ready, { refetch: true });
    expect(refetch).toHaveBeenCalledTimes(1);
    fake.fire('resync', { topics: ['inbox'] }, { refetch: true });
    expect(refetch).toHaveBeenCalledTimes(2);
  });
});

describe('useStreamStatus', () => {
  it('follows the client, and useStreamOpen is true only while it is open', () => {
    const fake = fakeClient();
    function Probe() {
      return (
        <p>
          {useStreamStatus()} {String(useStreamOpen())}
        </p>
      );
    }
    render(wrap(fake.client, <Probe />));
    expect(screen.getByText('idle false')).toBeInTheDocument();
    act(() => fake.setStatus('open'));
    expect(screen.getByText('open true')).toBeInTheDocument();
    act(() => fake.setStatus('retrying'));
    expect(screen.getByText('retrying false')).toBeInTheDocument();
  });
});

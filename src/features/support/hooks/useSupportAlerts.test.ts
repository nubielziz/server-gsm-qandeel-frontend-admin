// Tests for the support alerts, with a fake stream, a fake sound and a fake desktop notification: which events alert, who is alerted (an unassigned ticket or my own, not a
// colleague's), the one-per-message rule, the tab that holds the stream, the sound and desktop switches, and where a click on the notification goes.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '@/app/layout/PreferencesProvider';
import { StreamContext } from '@/lib/realtime';
import type { StreamClient, StreamEventMeta, StreamListener } from '@/lib/realtime';
import { message, reply, row } from '../test/fixtures';
import { useSupportAlerts } from './useSupportAlerts';

const { sound, showDesktopAlert } = vi.hoisted(() => ({
  sound: { arm: vi.fn(), play: vi.fn() },
  showDesktopAlert: vi.fn(),
}));
vi.mock('@/features/auth', () => ({ useMe: () => ({ data: { id: 1 } }) }));
vi.mock('../lib/alertSound', () => ({ createAlertSound: () => sound }));
vi.mock('../lib/desktopAlert', () => ({ showDesktopAlert }));

/** A stream client that lets the test send events (`relayed` says another tab passed it on). */
function fakeStream() {
  const listeners = new Map<string, Set<StreamListener>>();
  const client: StreamClient = {
    start: () => {},
    stop: () => {},
    subscribe(name, listener) {
      const set = listeners.get(name) ?? new Set<StreamListener>();
      set.add(listener);
      listeners.set(name, set);
      return () => set.delete(listener);
    },
    status: () => 'open',
    onStatus: () => () => {},
  };
  const emit = (name: string, data: unknown, meta: Partial<StreamEventMeta> = {}) =>
    act(() => {
      for (const listener of [...(listeners.get(name) ?? [])])
        listener(data, { cursor: null, refetch: false, relayed: false, ...meta });
    });
  return { client, emit };
}

let stream = fakeStream();
let where = '';
function Probe() {
  where = useLocation().pathname + useLocation().search;
  return null;
}

function mount() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        null,
        createElement(
          PreferencesProvider,
          null,
          createElement(StreamContext.Provider, { value: stream.client }, children),
          createElement(Probe),
        ),
      ),
    );
  return renderHook(() => useSupportAlerts(), { wrapper });
}

const wrote = (id: number, change = {}) => ({ ticketId: 10, message: message(id, change), live: true });
const updated = (change = {}) => ({ ticket: row({ number: 'T-10', ...change }) });
const hidden = (value: boolean) =>
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (value ? 'hidden' : 'visible'),
  });

beforeEach(() => {
  stream = fakeStream();
  sound.arm.mockReset().mockReturnValue(vi.fn());
  sound.play.mockReset().mockReturnValue(true);
  showDesktopAlert.mockReset().mockReturnValue(true);
  localStorage.setItem('gsm-support-desktop', '1');
});
afterEach(() => {
  vi.useRealTimers();
  hidden(false);
});

describe('the alert for a customer or merchant message', () => {
  it('plays the sound when the requester writes and the row that follows says the ticket is unassigned or mine', () => {
    mount();
    stream.emit('ticket.message.created', wrote(5));
    expect(sound.play).not.toHaveBeenCalled();
    stream.emit('ticket.updated', updated({ assigneeId: null }));
    expect(sound.play).toHaveBeenCalledTimes(1);
    stream.emit('ticket.message.created', wrote(6));
    stream.emit('ticket.updated', updated({ assigneeId: 1, assignee: { id: 1, name: 'Rami K.' } }));
    expect(sound.play).toHaveBeenCalledTimes(2);
  });

  it('is silent for a ticket assigned to a colleague', () => {
    mount();
    stream.emit('ticket.message.created', wrote(5));
    stream.emit('ticket.updated', updated({ assigneeId: 2, assignee: { id: 2, name: 'Lina S.' } }));
    expect(sound.play).not.toHaveBeenCalled();
    expect(showDesktopAlert).not.toHaveBeenCalled();
  });

  it('is silent for a replayed message, a colleague’s reply, a note, a system line and a message of the same id again', () => {
    mount();
    stream.emit('ticket.message.created', { ...wrote(5), live: false });
    stream.emit('ticket.message.created', { ticketId: 10, message: reply(6), live: true });
    stream.emit('ticket.message.created', wrote(7, { isInternal: true }));
    stream.emit('ticket.message.created', wrote(8, { authorType: 'system' }));
    stream.emit('ticket.updated', updated());
    expect(sound.play).not.toHaveBeenCalled();

    stream.emit('ticket.message.created', wrote(9));
    stream.emit('ticket.updated', updated());
    stream.emit('ticket.message.created', wrote(9));
    stream.emit('ticket.updated', updated({ updatedAt: '2026-11-15T10:00:01.000Z' }));
    expect(sound.play).toHaveBeenCalledTimes(1);
  });

  it('alerts for a merchant’s message as for a customer’s', () => {
    mount();
    stream.emit('ticket.message.created', wrote(5, { authorType: 'client' }));
    stream.emit(
      'ticket.updated',
      updated({ requesterType: 'client', requester: { name: 'Cairo GSM Lab', email: null } }),
    );
    expect(sound.play).toHaveBeenCalledTimes(1);
  });

  it('alerts even when the row never follows, after 3 seconds, and then with general words', () => {
    vi.useFakeTimers();
    hidden(true);
    mount();
    stream.emit('ticket.message.created', wrote(5));
    act(() => void vi.advanceTimersByTime(2_900));
    expect(sound.play).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(200));
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(showDesktopAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New message on a support ticket', body: '' }),
    );
  });

  it('alerts for a ticket that has just been opened even when only its row came', () => {
    mount();
    const created = new Date().toISOString();
    stream.emit('ticket.updated', updated({ status: 'new', createdAt: created, updatedAt: created }));
    expect(sound.play).toHaveBeenCalledTimes(1);
    stream.emit('ticket.updated', updated({ status: 'new', createdAt: created, updatedAt: created }));
    expect(sound.play).toHaveBeenCalledTimes(1);
  });

  it('does not alert for an old ticket that is changed', () => {
    mount();
    stream.emit('ticket.updated', updated({ status: 'open', priority: 'high' }));
    expect(sound.play).not.toHaveBeenCalled();
  });
});

describe('only the tab that holds the stream alerts', () => {
  it('stays silent for events another tab passed on', () => {
    mount();
    stream.emit('ticket.message.created', wrote(5), { relayed: true });
    stream.emit('ticket.updated', updated(), { relayed: true });
    expect(sound.play).not.toHaveBeenCalled();
    expect(showDesktopAlert).not.toHaveBeenCalled();
  });

  it('does not let a relayed row finish the alert of a message this tab holds, nor a relayed new-ticket row alert', () => {
    mount();
    const created = new Date().toISOString();
    stream.emit('ticket.updated', updated({ status: 'new', createdAt: created, updatedAt: created }), {
      relayed: true,
    });
    expect(sound.play).not.toHaveBeenCalled();
  });
});

describe('the sound', () => {
  it('waits for the first gesture on the page (it starts listening for it) and stops with the page', () => {
    const disarm = vi.fn();
    sound.arm.mockReturnValue(disarm);
    const view = mount();
    expect(sound.arm).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(disarm).toHaveBeenCalledTimes(1);
  });

  it('is off with the switch, and the desktop alert still works', () => {
    localStorage.setItem('gsm-support-sound', '0');
    hidden(true);
    mount();
    stream.emit('ticket.message.created', wrote(5));
    stream.emit('ticket.updated', updated());
    expect(sound.play).not.toHaveBeenCalled();
    expect(showDesktopAlert).toHaveBeenCalledTimes(1);
  });
});

describe('the desktop notification', () => {
  it('shows the ticket number and the requester’s name, never the message, while the tab is hidden', () => {
    hidden(true);
    mount();
    stream.emit('ticket.message.created', wrote(5, { body: 'My IMEI is 35 123456 789012 3' }));
    stream.emit('ticket.updated', updated({ number: 'T-1042' }));
    expect(showDesktopAlert).toHaveBeenCalledTimes(1);
    expect(showDesktopAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New message on T-1042',
        body: 'Victor Silva',
        tag: 'support-ticket-10',
      }),
    );
    expect(JSON.stringify(showDesktopAlert.mock.calls)).not.toContain('IMEI');
  });

  it('is not shown while the tab is visible', () => {
    mount();
    stream.emit('ticket.message.created', wrote(5));
    stream.emit('ticket.updated', updated());
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(showDesktopAlert).not.toHaveBeenCalled();
  });

  it('is not shown when the switch is off, which is how it starts', () => {
    localStorage.removeItem('gsm-support-desktop');
    hidden(true);
    mount();
    stream.emit('ticket.message.created', wrote(5));
    stream.emit('ticket.updated', updated());
    expect(showDesktopAlert).not.toHaveBeenCalled();
    expect(sound.play).toHaveBeenCalledTimes(1);
  });

  it('opens the ticket when it is clicked', () => {
    hidden(true);
    mount();
    stream.emit('ticket.message.created', wrote(5));
    stream.emit('ticket.updated', updated({ id: 10 }));
    const { onOpen } = showDesktopAlert.mock.calls[0][0] as { onOpen: () => void };
    act(() => onOpen());
    expect(where).toBe('/support?ticket=10');
  });
});

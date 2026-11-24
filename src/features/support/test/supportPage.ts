// Helpers shared by the support page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions) and
// find the list, the rows, the thread and the composer by their accessible names. Import them from tests only.
import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import {
  installMockEventSource,
  MockEventSource,
  openMockStreamCount,
  pushMockStreamEvent,
  uninstallMockEventSource,
} from '@/mocks/stream';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';
import { toTicket } from '../mocks/dto';
import { supportState } from '../mocks/store';
import type { Attachment, SupportTicket, TicketMessage } from '../types';

/** Signs in as Rami (the Owner, staff id 1) and makes `me` say these permissions, before the page loads. */
async function signIn(permissions?: string[]): Promise<void> {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
}

/** Opens a route of the Support page and waits for its heading. */
export async function openSupport(route = '/support', options: { permissions?: string[] } = {}) {
  await signIn(options.permissions);
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Support' }, { timeout: 10_000 });
  return app;
}

/** The ticket list, once it has loaded. */
export async function ticketList() {
  return within(await screen.findByRole('list', { name: 'Tickets' }, { timeout: 10_000 }));
}

/** The subjects of the tickets in the list, top to bottom, once the list has loaded. */
export async function subjects(): Promise<string[]> {
  const list = await ticketList();
  return list.getAllByRole('button').map((button) => button.querySelector('p')?.textContent ?? '');
}

/** The list row (a button) that holds some text. */
export async function ticketRow(text: string | RegExp) {
  const row = (await ticketList()).getByText(text).closest('button');
  if (!row) throw new Error(`No ticket row holds "${String(text)}".`);
  return within(row);
}

/** The open thread's title, once it shows. */
export const threadTitle = (name: string | RegExp) =>
  screen.findByRole('heading', { level: 2, name }, { timeout: 10_000 });

/** The figures strip. */
export const figures = () => within(screen.getByRole('region', { name: 'Support figures' }));

/** The text of the filter that is pressed in a segmented group. */
export const pressed = (group: string) =>
  within(screen.getByRole('group', { name: group }))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent);

/** Waits until the list shows exactly these subjects (a filter or search has been applied). */
export async function waitForSubjects(expected: string[]) {
  await waitFor(async () => expect(await subjects()).toEqual(expected));
}

/** The conversation of the open thread, once it has loaded. */
export const conversation = async () =>
  within(await screen.findByRole('log', { name: 'Conversation' }, { timeout: 10_000 }));

/** The reply box (or the note box while "Internal note" is on), once the thread has loaded. */
export const composerBox = (name: 'Reply' | 'Internal note' = 'Reply') =>
  screen.findByRole('textbox', { name }, { timeout: 10_000 });

/** The priority, assignee and reply-template selects of the open thread. */
export const priorityBox = () => screen.findByRole('combobox', { name: 'Priority' }, { timeout: 10_000 });
export const assigneeBox = () => screen.findByRole('combobox', { name: 'Assignee' }, { timeout: 10_000 });
export const templateBox = () =>
  screen.findByRole('combobox', { name: 'Reply templates' }, { timeout: 10_000 });

/** The labels of a select's options. */
export const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);

// ---- The live stream (feature 28) ----

/** Call once inside a `describe`: its tests run with the dev stand-in for the stream (opens at once, no heartbeat) and a clean mock server afterwards. */
export function useMockStream(): void {
  beforeEach(() => {
    MockEventSource.readyDelayMs = 0;
    MockEventSource.heartbeatMs = 0;
    installMockEventSource();
  });
  afterEach(() => {
    vi.useRealTimers();
    uninstallMockEventSource();
    MockEventSource.readyDelayMs = 20;
    MockEventSource.heartbeatMs = 15_000;
    mockServer.events.removeAllListeners();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    vi.restoreAllMocks();
  });
}

/** Waits until the page's stream is open. */
export const streamOpen = () => waitFor(() => expect(openMockStreamCount()).toBe(1));

/** Sends one event to the open stream, as if the server had written it (`id` is the stream cursor, `t<message id>` for a message). */
export const push = (name: string, data: unknown, id?: string) =>
  act(() => pushMockStreamEvent(name, data, id));

/** One request the page sent: its method and address at once, its JSON body a moment later (`body` stays undefined for an upload). */
export type Sent = { method: string; url: URL; body: unknown };

/** Records every request whose address contains `part`. The list fills while the test runs; the listener goes with the mock server's reset. */
export function recordRequests(part: string): Sent[] {
  const sent: Sent[] = [];
  mockServer.events.on('request:start', ({ request }) => {
    if (!request.url.includes(part)) return;
    const entry: Sent = { method: request.method, url: new URL(request.url), body: undefined };
    sent.push(entry);
    if (!(request.headers.get('content-type') ?? '').includes('json')) return;
    void request
      .clone()
      .text()
      .then((text) => {
        entry.body = text ? JSON.parse(text) : undefined;
      });
  });
  return sent;
}

/** Makes the tab look visible or hidden, and focused or not, the way a browser reports it (and tells the page). */
export function setAttention(visible: boolean, focused = visible): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (visible ? 'visible' : 'hidden'),
  });
  vi.spyOn(document, 'hasFocus').mockReturnValue(focused);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event(focused ? 'focus' : 'blur'));
  });
}

/** A message as the staff stream sends it (the staff view). */
export function liveMessage(
  ticketId: number,
  id: number,
  change: Partial<TicketMessage> = {},
): TicketMessage {
  return {
    id,
    ticketId,
    authorType: 'account',
    authorId: 128,
    authorName: 'Victor Silva',
    body: `Message ${id}`,
    isInternal: false,
    fileIds: [],
    attachments: [],
    createdAt: new Date(Date.now() + id).toISOString(),
    ...change,
  };
}

/** The `ticket.message.created` frame for a message. */
export const messageFrame = (message: TicketMessage, live = true) => ({
  ticketId: message.ticketId,
  message,
  live,
});

/** A staff reply by this colleague (Lina S. is staff id 2 in the seed). */
export const colleagueReply = (ticketId: number, id: number, change: Partial<TicketMessage> = {}) =>
  liveMessage(ticketId, id, { authorType: 'staff', authorId: 2, authorName: 'Lina S.', ...change });

/** A staff list row as the stream sends it, from a row the API gave. */
export const rowFrame = (ticket: SupportTicket, change: Partial<SupportTicket> = {}) => ({
  ticket: { ...ticket, ...change },
});

/** An attachment of a pushed message. */
export const pdf = (id: number, filename = 'invoice.pdf', size = 340 * 1024): Attachment => ({
  id,
  filename,
  mime: 'application/pdf',
  size,
});

/** The requester writes on a ticket: the mock keeps the message and the stream carries it (the message, then the row), as the real server does. */
export async function customerWrites(ticketId: number, body = 'A new question'): Promise<TicketMessage> {
  const state = await supportState();
  const ticket = state.tickets.find(ticketId);
  if (!ticket) throw new Error(`No ticket ${ticketId}.`);
  const message = liveMessage(ticketId, state.nextMessageId++, {
    authorType: ticket.requesterType,
    authorId: ticket.requesterId,
    authorName: ticket.requester.name,
    body,
  });
  ticket.messages.push(message);
  ticket.updatedAt = message.createdAt;
  push('ticket.message.created', messageFrame(message), `t${message.id}`);
  push('ticket.updated', { ticket: toTicket(ticket) });
  return message;
}

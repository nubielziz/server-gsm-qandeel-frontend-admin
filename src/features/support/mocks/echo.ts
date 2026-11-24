// A dev-only stand-in for the customer: a reply that contains `/echo` is answered as the requester a few seconds later, so the live parts of the thread can be seen
// without a second person: the requester sees the reply (the "Seen" line), then writes back (the new message, the unread dot, the alert sound and the
// desktop notification). Timers are kept so a test or a reset can stop them. Dev and tests only.
import type { TicketMessage } from '../types';
import { pushMessageAndTicket, pushRead } from './liveEvents';
import type { MockTicket, SupportState } from './types';

/** The word that starts it, in the text of a reply. */
export const ECHO_WORD = '/echo';
/** When each step happens, after the reply is sent. */
export const ECHO_SEEN_MS = 1_000;
export const ECHO_ANSWER_MS = 4_000;

const timers = new Set<ReturnType<typeof setTimeout>>();

function later(ms: number, run: () => void): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    run();
  }, ms);
  timers.add(timer);
}

/** Stops every step still waiting (the store was reset). */
export function stopEchoes(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}

/** True for a public reply whose text asks for the stand-in. */
export function wantsEcho(reply: TicketMessage): boolean {
  return !reply.isInternal && reply.body.includes(ECHO_WORD);
}

/** Plays the requester's side after `reply`: seen at once, then an answer. */
export function playEcho(state: SupportState, ticket: MockTicket, reply: TicketMessage): void {
  later(ECHO_SEEN_MS, () => {
    const at = new Date().toISOString();
    if ((ticket.requesterSeenMessageId ?? 0) < reply.id) {
      ticket.requesterSeenMessageId = reply.id;
      ticket.requesterSeenAt = at;
    }
    pushRead(ticket, 'requester', reply.id, at);
  });
  later(ECHO_ANSWER_MS, () => {
    const message: TicketMessage = {
      id: state.nextMessageId++,
      ticketId: ticket.id,
      authorType: ticket.requesterType,
      authorId: ticket.requesterId,
      authorName: ticket.requester.name,
      body: 'Thanks, that helps. One more question: how long will it take?',
      isInternal: false,
      fileIds: [],
      attachments: [],
      createdAt: new Date().toISOString(),
    };
    ticket.messages.push(message);
    ticket.updatedAt = message.createdAt;
    if (ticket.status === 'pending') ticket.status = 'open';
    pushMessageAndTicket(ticket, message);
  });
}
